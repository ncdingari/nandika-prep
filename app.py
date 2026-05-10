"""
NandikaPrep V2 Shiny app entry point.
"""
import sys
import uuid
import json
from datetime import datetime
from pathlib import Path

from shiny import App, reactive, ui, render, Session

import shared
from lib import db as db_lib
from lib.email_summary import schedule_weekly_email
from lib.question_bank import seed_question_bank


def _get_cookie(session: Session, name: str) -> str:
    cookie = session.input.get(f".clientdata_cookie_{name}")
    if callable(cookie):
        try:
            val = cookie()
            if val:
                return val
        except Exception:
            return ""
    return ""


def _ensure_cookie(session: Session, name: str) -> str:
    val = _get_cookie(session, name)
    if val:
        return val
    new_token = str(uuid.uuid4())
    session.send_custom_message("set_session_cookie", {"name": name, "value": new_token, "days": 365})
    return new_token


def _ensure_login_code(db, user: db_lib.User) -> str | None:
    if user.login_code_hash:
        return None
    try:
        import bcrypt
        code = str(uuid.uuid4().int)[-6:]
        user.login_code_hash = bcrypt.hashpw(code.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")
        db.commit()
        return code
    except Exception:
        return None


app_ui = ui.page_fluid(
    ui.tags.head(
        ui.tags.link(rel="stylesheet", href="styles.css"),
        ui.tags.link(rel="manifest", href="manifest.json"),
        ui.tags.meta(name="viewport", content="width=device-width, initial-scale=1, viewport-fit=cover"),
        ui.tags.script(src="nandika.js"),
    ),
    ui.div(ui.output_ui("main_content"), id="main-app"),
)


def server(input, output, session: Session):
    db_lib.create_tables()
    seed_db = shared.SessionLocal()
    try:
        seed_question_bank(seed_db)
    finally:
        seed_db.close()
    schedule_weekly_email(shared.SessionLocal)

    session_token = _ensure_cookie(session, shared.NANDIKA_SESSION_COOKIE)
    device_token = _ensure_cookie(session, shared.NANDIKA_DEVICE_COOKIE)
    db = shared.SessionLocal()

    login_code_display = reactive.value(None)
    try:
        user = db_lib.get_or_create_user(db, name=shared.NANDIKA_USER_NAME, session_token=session_token)
        new_code = _ensure_login_code(db, user)
        if new_code:
            login_code_display.set(new_code)
    except Exception as e:
        print(f"[app.py] DB init failed: {e}", file=sys.stderr)
        db.close()
        return

    device = db.query(db_lib.DeviceSession).filter_by(user_id=user.id, device_token=device_token).first()

    current_screen = reactive.value("home")
    parent_panel_visible = reactive.value(False)
    energy_level = reactive.value("regular")
    resume_session_id = reactive.value(None)
    bonus_focus = reactive.value(None)

    def _parent_settings():
        profile = db_lib.get_profile(db, user.id)
        if not profile or not profile.parent_notes:
            return {}
        try:
            parsed = json.loads(profile.parent_notes)
            return parsed.get("settings", {}) if isinstance(parsed, dict) else {}
        except Exception:
            return {}

    @reactive.effect
    def _init_route():
        summary = db_lib.get_screening_summary(db, user.id)
        if device is None:
            current_screen.set("device_login")
            return
        if device.device_role_set_at is None:
            current_screen.set("device_setup")
        elif not summary or not summary.completed:
            current_screen.set("screening")
        else:
            current_screen.set("home")

    @output
    @render.ui
    def main_content():
        screen = current_screen.get()
        panel_vis = parent_panel_visible.get()

        panel_html = ui.div()
        if panel_vis:
            from modules.parent_panel import parent_panel_ui, parent_panel_server
            panel_html = parent_panel_ui("parent_panel")
            parent_panel_server(
                "parent_panel",
                user_id=user.id,
                db=db,
                device_token=device_token,
                on_close=lambda: _close_parent_panel(),
            )

        if screen == "device_setup":
            return _device_setup_ui(device, panel_html)
        if screen == "device_login":
            return _device_login_ui(panel_html)

        if screen == "screening":
            from modules.screening import screening_ui, screening_server
            screening_server("screening", user_id=user.id, db=db, on_complete=lambda: current_screen.set("home"))
            return ui.div(screening_ui("screening"), panel_html)

        if screen == "daily":
            from modules.daily_session import daily_session_ui, daily_session_server
            settings = _parent_settings()
            daily_session_server(
                "daily",
                user_id=user.id,
                db=db,
                energy_level=energy_level.get(),
                session_type="daily",
                resume_session_id=resume_session_id.get(),
                on_complete=lambda: current_screen.set("home"),
                on_bonus=_start_bonus,
                bonus_enabled=not settings.get("disable_bonus", False),
            )
            return ui.div(daily_session_ui("daily"), panel_html)

        if screen == "bonus":
            from modules.daily_session import daily_session_ui, daily_session_server
            daily_session_server(
                "bonus",
                user_id=user.id,
                db=db,
                energy_level="bonus",
                session_type="bonus",
                resume_session_id=None,
                on_complete=lambda: current_screen.set("home"),
                on_bonus=_start_bonus,
                bonus_enabled=False,
                bonus_focus=bonus_focus.get(),
            )
            return ui.div(daily_session_ui("bonus"), panel_html)

        from modules.home import home_ui, home_server
        home_server(
            "home",
            user_id=user.id,
            db=db,
            device_role=device.device_role,
            on_start_daily=_start_daily,
            on_resume=_resume_daily,
            on_open_parent=lambda: parent_panel_visible.set(True),
            on_open_progress=lambda: None,
        )
        return ui.div(home_ui("home"), panel_html)

    def _device_setup_ui(device_row, panel_html):
        return ui.div(
            ui.div(
                ui.h2("Is this device for Nandika or for a parent?"),
                ui.input_action_button("device_student", "Nandika's device", class_="btn-primary btn-big"),
                ui.input_action_button("device_parent", "Parent's device", class_="btn-secondary btn-big"),
                class_="question-card",
            ),
            panel_html,
        )

    def _device_login_ui(panel_html):
        code_note = login_code_display.get()
        note_html = f"<p>Login code: <b>{code_note}</b></p>" if code_note else ""
        return ui.div(
            ui.div(
                ui.h2("Enter the login code"),
                ui.HTML(note_html),
                ui.input_password("login_code", "Login code"),
                ui.input_action_button("login_code_submit", "Continue", class_="btn-primary btn-big"),
                class_="question-card",
            ),
            panel_html,
        )

    @reactive.effect
    @reactive.event(input.device_student)
    def _set_student():
        device.device_role = "student"
        device.device_role_set_at = datetime.utcnow()
        db.commit()
        current_screen.set("screening")

    @reactive.effect
    @reactive.event(input.device_parent)
    def _set_parent():
        device.device_role = "parent"
        db.commit()
        parent_panel_visible.set(True)
        current_screen.set("home")

    @reactive.effect
    @reactive.event(input.login_code_submit)
    def _login_device():
        nonlocal device
        code = input.login_code() or ""
        try:
            import bcrypt
            if not user.login_code_hash or not bcrypt.checkpw(code.encode("utf-8"), user.login_code_hash.encode("utf-8")):
                return
        except Exception:
            return
        device = db_lib.DeviceSession(user_id=user.id, device_token=device_token, device_role="student")
        db.add(device)
        db.commit()
        db.refresh(device)
        current_screen.set("device_setup")

    def _close_parent_panel():
        parent_panel_visible.set(False)
        if device.device_role == "parent" and device.device_role_set_at is None:
            device.device_role = "student"
            db.commit()

    def _start_daily(selected_energy: str):
        energy_level.set(selected_energy)
        resume_session_id.set(None)
        current_screen.set("daily")

    def _resume_daily(session_id: int):
        resume_session_id.set(session_id)
        current_screen.set("daily")

    def _start_bonus(focus: str | None):
        bonus_focus.set(focus or "surprise")
        current_screen.set("bonus")

    @reactive.effect
    def _cleanup():
        session.on_ended(lambda: db.close())


app = App(app_ui, server, static_assets=Path(__file__).parent / "static")
