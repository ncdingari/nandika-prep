"""
Parent panel with passphrase gating and device management.
"""
from datetime import datetime, timedelta
import uuid
import json

import bcrypt
from shiny import module, ui, reactive, render

from lib import db as db_lib
from lib.curriculum import phase_for_user


@module.ui
def parent_panel_ui():
    return ui.div(
        ui.output_ui("parent_panel_content"),
        class_="parent-panel-overlay visible",
    )


@module.server
def parent_panel_server(input, output, session, user_id, db, device_token: str | None, on_close):
    auth_ok = reactive.value(False)
    auth_error = reactive.value("")
    info_msg = reactive.value("")

    def _device_session():
        if not device_token:
            return None
        row = db.query(db_lib.DeviceSession).filter_by(user_id=user_id, device_token=device_token).first()
        if not row:
            row = db_lib.DeviceSession(user_id=user_id, device_token=device_token, device_role="student")
            db.add(row)
            db.commit()
            db.refresh(row)
        row.last_seen_at = datetime.utcnow()
        db.commit()
        return row

    def _log(action: str):
        db.add(db_lib.AuditLog(user_id=user_id, device_token=device_token, action=action))
        db.commit()

    def _parent_session_active() -> bool:
        if not device_token:
            return False
        row = (
            db.query(db_lib.ParentPanelSession)
            .filter_by(user_id=user_id, device_token=device_token)
            .first()
        )
        if not row:
            return False
        if row.expires_at < datetime.utcnow():
            db.delete(row)
            db.commit()
            return False
        return True

    def _set_auth(success: bool):
        auth_ok.set(success)
        auth_error.set("")
        if success:
            _log("parent_panel_authenticated")
            if device_token:
                device = _device_session()
                if device:
                    device.device_role = "parent"
                    device.device_role_set_at = datetime.utcnow()
                    db.commit()

    def _hash_passphrase(pw: str) -> str:
        return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")

    def _check_passphrase(pw: str, hashed: str) -> bool:
        return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))

    def _parent_settings(profile: db_lib.Profile | None) -> dict:
        if not profile or not profile.parent_notes:
            return {}
        try:
            parsed = json.loads(profile.parent_notes)
            return parsed.get("settings", {}) if isinstance(parsed, dict) else {}
        except Exception:
            return {}

    def _save_parent_settings(profile: db_lib.Profile, settings: dict):
        notes = ""
        try:
            parsed = json.loads(profile.parent_notes) if profile.parent_notes else {}
        except Exception:
            parsed = {}
        parsed = parsed if isinstance(parsed, dict) else {}
        parsed["settings"] = settings
        parsed["notes"] = parsed.get("notes", "")
        profile.parent_notes = json.dumps(parsed)
        db.commit()

    @reactive.effect
    def _init():
        device = _device_session()
        if device and device.device_role != "parent":
            auth_ok.set(False)
            auth_error.set("Parent settings are only available on parent devices.")
            return
        if _parent_session_active():
            auth_ok.set(True)
        else:
            auth_ok.set(False)

    @output
    @render.ui
    def parent_panel_content():
        user = db.query(db_lib.User).filter_by(id=user_id).first()
        if not user:
            return ui.div(ui.p("No user found."))

        if auth_ok.get():
            return _render_panel(user)

        if auth_error.get():
            return ui.div(ui.p(auth_error.get()))

        if user.parent_passphrase_hash:
            return _passphrase_prompt()
        return _passphrase_setup()

    def _passphrase_prompt():
        return ui.div(
            ui.div(
                ui.h3("Type the parent passphrase to open settings."),
                ui.input_password("parent_passphrase", "Passphrase"),
                ui.input_action_button("open_parent_panel", "Open", class_="btn-primary"),
                ui.input_action_button("cancel_parent_panel", "Cancel", class_="btn-ghost"),
                ui.p(auth_error.get(), class_="error") if auth_error.get() else ui.div(),
                class_="parent-panel-content",
            )
        )

    def _passphrase_setup():
        return ui.div(
            ui.div(
                ui.h3("Set a parent passphrase"),
                ui.p("This protects settings and tuning controls."),
                ui.input_password("new_passphrase", "New passphrase"),
                ui.input_password("confirm_passphrase", "Confirm passphrase"),
                ui.input_action_button("set_passphrase", "Save Passphrase", class_="btn-primary"),
                ui.p(info_msg.get()) if info_msg.get() else ui.div(),
                class_="parent-panel-content",
            )
        )

    def _render_panel(user: db_lib.User):
        return ui.div(
            ui.div(
                ui.input_action_button("lock_panel", "Lock parent panel", class_="btn-ghost"),
                ui.input_action_button("close_panel", "Close", class_="btn-ghost"),
                ui.h2("Settings and Tuning"),
                class_="panel-header",
            ),
            ui.navset_tab(
                ui.nav_panel("Overview", ui.output_ui("tab_overview")),
                ui.nav_panel("Progress charts", ui.output_ui("tab_progress")),
                ui.nav_panel("Goal weights", ui.output_ui("tab_goals")),
                ui.nav_panel("Phase control", ui.output_ui("tab_phase")),
                ui.nav_panel("Parent nudges", ui.output_ui("tab_nudges")),
                ui.nav_panel("Writing and AI stats", ui.output_ui("tab_writing_ai")),
                ui.nav_panel("Devices", ui.output_ui("tab_devices")),
                ui.nav_panel("Settings", ui.output_ui("tab_settings")),
                ui.nav_panel("Audit log", ui.output_ui("tab_audit")),
            ),
            class_="parent-panel-content",
        )

    @render.ui
    def tab_overview():
        user = db.query(db_lib.User).filter_by(id=user_id).first()
        profile = db_lib.get_profile(db, user_id)
        streak = db.query(db_lib.DailySession).filter_by(user_id=user_id).count()
        total_questions = db.query(db_lib.SessionQuestion).join(db_lib.DailySession).filter(
            db_lib.DailySession.user_id == user_id
        ).count()
        badges = db.query(db_lib.Badge).filter_by(user_id=user_id).all()
        badge_list = ", ".join(b.badge_code for b in badges) if badges else "None yet"
        phase = phase_for_user(user.start_date) if user else 1
        ability = profile.ability_estimates if profile else {}
        ability_rows = "".join(
            f"<li>{k}: {v.get('level', '?')}</li>" for k, v in ability.items()
        ) or "<li>No estimates yet.</li>"
        return ui.HTML(
            f"<div class='panel-tab'>"
            f"<p><b>Streak days:</b> {streak}</p>"
            f"<p><b>Total questions:</b> {total_questions}</p>"
            f"<p><b>Current phase:</b> {phase}</p>"
            f"<p><b>Badges:</b> {badge_list}</p>"
            f"<h4>Ability estimates</h4><ul>{ability_rows}</ul>"
            f"</div>"
        )

    @render.ui
    def tab_progress():
        profile = db_lib.get_profile(db, user_id)
        ability = profile.ability_estimates if profile else {}
        rows = "".join(
            f"<tr><td>{k}</td><td>{v.get('level')}</td><td>{v.get('confidence')}</td></tr>"
            for k, v in ability.items()
        ) or "<tr><td colspan='3'>No data yet</td></tr>"
        return ui.HTML(
            f"<div class='panel-tab'>"
            f"<h3>Current ability estimates</h3>"
            f"<table><tr><th>Dimension</th><th>Level</th><th>Confidence</th></tr>{rows}</table>"
            f"</div>"
        )

    @render.ui
    def tab_goals():
        profile = db_lib.get_profile(db, user_id)
        weights = profile.goal_weights if profile else {}
        return ui.div(
            ui.h3("Goal weights"),
            ui.input_slider("goal_cogat", "Pass CogAT Level 8 in August", min=0, max=10, value=weights.get("cogat_pass", 10)),
            ui.input_slider("goal_math", "Advance Kumon Math toward Level E", min=0, max=10, value=weights.get("kumon_math", 7)),
            ui.input_slider("goal_reading", "Advance Kumon Reading toward Level EI", min=0, max=10, value=weights.get("kumon_reading", 7)),
            ui.input_slider("goal_writing", "Strengthen writing depth", min=0, max=10, value=weights.get("writing", 5)),
            ui.input_slider("goal_science", "Build science vocabulary", min=0, max=10, value=weights.get("science_vocab", 3)),
            ui.input_slider("goal_geo", "Build geography awareness", min=0, max=10, value=weights.get("geography", 3)),
            ui.input_action_button("save_goals", "Save goal weights", class_="btn-primary"),
        )

    @render.ui
    def tab_phase():
        profile = db_lib.get_profile(db, user_id)
        settings = _parent_settings(profile)
        avg_questions = db.query(db_lib.DailySession).filter_by(user_id=user_id).count()
        return ui.div(
            ui.h3("Phase control"),
            ui.p(f"Average questions per day: {avg_questions}"),
            ui.input_checkbox("disable_energy", "Disable energy slider (always regular)", value=settings.get("disable_energy", False)),
            ui.input_checkbox("disable_bonus", "Disable bonus session offers", value=settings.get("disable_bonus", False)),
            ui.input_select("default_energy", "Default energy if no choice", choices=["light", "regular", "big"], selected=settings.get("default_energy", "regular")),
            ui.input_text("today_energy_override", "Today's energy override", value=settings.get("today_energy_override", "")),
            ui.input_action_button("save_phase_settings", "Save phase settings", class_="btn-primary"),
        )

    @render.ui
    def tab_nudges():
        nudges = db.query(db_lib.ParentNudge).filter_by(user_id=user_id, active=True).all()
        rows = "".join(f"<li>{n.nudge_text}</li>" for n in nudges) or "<li>No active nudges.</li>"
        return ui.div(
            ui.h3("Parent nudges"),
            ui.input_text_area("nudge_text", "New nudge", value=""),
            ui.input_action_button("add_nudge", "Add nudge", class_="btn-primary"),
            ui.HTML(f"<ul>{rows}</ul>"),
        )

    @render.ui
    def tab_writing_ai():
        samples = db.query(db_lib.WritingSample).filter_by(user_id=user_id).order_by(
            db_lib.WritingSample.created_at.desc()
        ).limit(10).all()
        stats = db.query(db_lib.ProviderStat).filter_by(user_id=user_id).all()
        s_rows = "".join(
            f"<tr><td>{s.provider}</td><td>{s.success_count}</td><td>{s.fail_count}</td><td>{s.vision_call_count}</td></tr>"
            for s in stats
        ) or "<tr><td colspan='4'>No data yet</td></tr>"
        w_rows = "".join(
            f"<div class='writing-sample-card'><div><b>Prompt:</b> {w.prompt or ''}</div>"
            f"<div>{w.response or ''}</div><div>{w.encouragement or ''}</div></div>"
            for w in samples
        ) or "<p>No writing samples yet.</p>"
        return ui.HTML(
            f"<div class='panel-tab'><h3>Writing samples</h3>{w_rows}"
            f"<h3>AI provider stats</h3>"
            f"<table><tr><th>Provider</th><th>Success</th><th>Fail</th><th>Vision</th></tr>{s_rows}</table>"
            f"</div>"
        )

    @render.ui
    def tab_devices():
        devices = db.query(db_lib.DeviceSession).filter_by(user_id=user_id).all()
        rows = []
        for d in devices:
            rows.append(
                ui.div(
                    ui.p(f"{d.device_name or d.device_token}"),
                    ui.input_select(f"role_{d.device_token}", "Role", choices=["student", "parent"], selected=d.device_role),
                )
            )
        return ui.div(
            ui.h3("Devices"),
            *rows,
            ui.input_action_button("save_device_roles", "Save device roles", class_="btn-primary"),
        )

    @render.ui
    def tab_settings():
        user = db.query(db_lib.User).filter_by(id=user_id).first()
        return ui.div(
            ui.h3("Settings"),
            ui.p("Database connection is configured via environment variables."),
            ui.input_text("target_date", "Target test date", value=user.target_date.isoformat()),
            ui.input_action_button("save_target_date", "Save target date", class_="btn-primary"),
            ui.h4("Login code"),
            ui.input_action_button("rotate_login_code", "Rotate login code", class_="btn-secondary"),
            ui.p(info_msg.get()) if info_msg.get() else ui.div(),
            ui.h4("Change parent passphrase"),
            ui.input_password("current_passphrase", "Current passphrase"),
            ui.input_password("new_passphrase_change", "New passphrase"),
            ui.input_password("confirm_passphrase_change", "Confirm new passphrase"),
            ui.input_action_button("change_passphrase", "Change passphrase", class_="btn-primary"),
            ui.h4("Forgot passphrase"),
            ui.input_text("login_code_recover", "Login code"),
            ui.input_action_button("request_recovery", "Request recovery", class_="btn-secondary"),
            ui.input_password("new_passphrase_recover", "New passphrase after cooldown"),
            ui.input_action_button("complete_recovery", "Set new passphrase", class_="btn-primary"),
        )

    @render.ui
    def tab_audit():
        since = datetime.utcnow() - timedelta(days=30)
        rows = db.query(db_lib.AuditLog).filter_by(user_id=user_id).filter(
            db_lib.AuditLog.created_at >= since
        ).order_by(db_lib.AuditLog.created_at.desc()).all()
        lines = "".join(
            f"<li>{r.created_at.isoformat()} - {r.action}</li>" for r in rows
        ) or "<li>No audit activity.</li>"
        return ui.HTML(f"<div class='panel-tab'><ul>{lines}</ul></div>")

    @reactive.effect
    @reactive.event(input.set_passphrase)
    def _set_passphrase():
        user = db.query(db_lib.User).filter_by(id=user_id).first()
        pw = input.new_passphrase() or ""
        confirm = input.confirm_passphrase() or ""
        if len(pw) < 8:
            info_msg.set("Passphrase must be at least 8 characters.")
            return
        if pw != confirm:
            info_msg.set("Passphrases do not match.")
            return
        if user.login_code_hash and _check_passphrase(pw, user.login_code_hash):
            info_msg.set("Passphrase cannot match the login code.")
            return
        user.parent_passphrase_hash = _hash_passphrase(pw)
        user.parent_passphrase_set_at = datetime.utcnow()
        db.commit()
        info_msg.set("Passphrase set. Please open the panel.")
        _log("parent_passphrase_set")

    @reactive.effect
    @reactive.event(input.open_parent_panel)
    def _open_panel():
        device = _device_session()
        user = db.query(db_lib.User).filter_by(id=user_id).first()
        if not device or not user:
            return
        if device.passphrase_locked_until and device.passphrase_locked_until > datetime.utcnow():
            auth_error.set("Too many attempts. Try again later.")
            return
        pw = input.parent_passphrase() or ""
        if not user.parent_passphrase_hash or not _check_passphrase(pw, user.parent_passphrase_hash):
            _record_fail(device)
            auth_error.set("Passphrase incorrect.")
            return
        _clear_fail(device)
        expiry = datetime.utcnow() + timedelta(hours=1)
        db.add(db_lib.ParentPanelSession(user_id=user_id, device_token=device_token, expires_at=expiry))
        db.commit()
        _set_auth(True)

    def _record_fail(device: db_lib.DeviceSession):
        now = datetime.utcnow()
        window_start = device.passphrase_fail_window_start or now
        if now - window_start > timedelta(minutes=10):
            device.passphrase_fail_window_start = now
            device.passphrase_fail_count = 1
        else:
            device.passphrase_fail_count = (device.passphrase_fail_count or 0) + 1
        if device.passphrase_fail_count >= 5:
            device.passphrase_locked_until = now + timedelta(hours=1)
            device.passphrase_fail_count = 0
            device.passphrase_fail_window_start = None
        db.commit()

    def _clear_fail(device: db_lib.DeviceSession):
        device.passphrase_fail_count = 0
        device.passphrase_fail_window_start = None
        device.passphrase_locked_until = None
        db.commit()

    @reactive.effect
    @reactive.event(input.lock_panel)
    def _lock_panel():
        if device_token:
            db.query(db_lib.ParentPanelSession).filter_by(device_token=device_token).delete()
            db.commit()
            auth_ok.set(False)
            _log("parent_panel_locked")

    @reactive.effect
    @reactive.event(input.close_panel)
    def _close_panel():
        on_close()

    @reactive.effect
    @reactive.event(input.save_goals)
    def _save_goals():
        profile = db_lib.get_profile(db, user_id)
        profile.goal_weights = {
            "cogat_pass": input.goal_cogat(),
            "kumon_math": input.goal_math(),
            "kumon_reading": input.goal_reading(),
            "writing": input.goal_writing(),
            "science_vocab": input.goal_science(),
            "geography": input.goal_geo(),
        }
        db.commit()
        _log("goal_weights_updated")

    @reactive.effect
    @reactive.event(input.save_phase_settings)
    def _save_phase():
        profile = db_lib.get_profile(db, user_id)
        settings = {
            "disable_energy": input.disable_energy(),
            "disable_bonus": input.disable_bonus(),
            "default_energy": input.default_energy(),
            "today_energy_override": input.today_energy_override(),
        }
        _save_parent_settings(profile, settings)
        _log("phase_settings_updated")

    @reactive.effect
    @reactive.event(input.add_nudge)
    def _add_nudge():
        text = input.nudge_text() or ""
        if not text.strip():
            return
        db.add(
            db_lib.ParentNudge(
                user_id=user_id,
                nudge_text=text.strip(),
                active=True,
                created_at=datetime.utcnow(),
                expires_at=datetime.utcnow() + timedelta(days=3),
            )
        )
        db.commit()
        _log("parent_nudge_added")

    @reactive.effect
    @reactive.event(input.save_device_roles)
    def _save_device_roles():
        devices = db.query(db_lib.DeviceSession).filter_by(user_id=user_id).all()
        for d in devices:
            field_id = f"role_{d.device_token}"
            if hasattr(input, field_id):
                new_role = getattr(input, field_id)()
                if new_role != d.device_role:
                    d.device_role = new_role
                    if new_role == "student":
                        db.query(db_lib.ParentPanelSession).filter_by(device_token=d.device_token).delete()
                    _log(f"device_role_changed:{d.device_token}:{new_role}")
        db.commit()

    @reactive.effect
    @reactive.event(input.save_target_date)
    def _save_target_date():
        user = db.query(db_lib.User).filter_by(id=user_id).first()
        try:
            user.target_date = datetime.fromisoformat(input.target_date()).date()
        except Exception:
            return
        db.commit()
        _log("target_date_updated")

    @reactive.effect
    @reactive.event(input.rotate_login_code)
    def _rotate_login_code():
        user = db.query(db_lib.User).filter_by(id=user_id).first()
        code = str(uuid.uuid4().int)[-6:]
        user.login_code_hash = _hash_passphrase(code)
        db.commit()
        info_msg.set(f"New login code: {code}")
        _log("login_code_rotated")

    @reactive.effect
    @reactive.event(input.change_passphrase)
    def _change_passphrase():
        user = db.query(db_lib.User).filter_by(id=user_id).first()
        current = input.current_passphrase() or ""
        new_pw = input.new_passphrase_change() or ""
        confirm = input.confirm_passphrase_change() or ""
        if not user.parent_passphrase_hash or not _check_passphrase(current, user.parent_passphrase_hash):
            info_msg.set("Current passphrase is incorrect.")
            return
        if len(new_pw) < 8 or new_pw != confirm:
            info_msg.set("New passphrase must match and be at least 8 characters.")
            return
        user.parent_passphrase_hash = _hash_passphrase(new_pw)
        user.parent_passphrase_set_at = datetime.utcnow()
        db.query(db_lib.ParentPanelSession).filter_by(user_id=user_id).delete()
        db.commit()
        _log("parent_passphrase_changed")
        auth_ok.set(False)

    @reactive.effect
    @reactive.event(input.request_recovery)
    def _request_recovery():
        user = db.query(db_lib.User).filter_by(id=user_id).first()
        code = input.login_code_recover() or ""
        if not user.login_code_hash or not _check_passphrase(code, user.login_code_hash):
            info_msg.set("Login code incorrect.")
            return
        user.passphrase_reset_requested_at = datetime.utcnow()
        user.passphrase_reset_available_at = datetime.utcnow() + timedelta(hours=1)
        db.commit()
        info_msg.set("Recovery requested. Try again after the cooldown.")
        _log("passphrase_recovery_requested")

    @reactive.effect
    @reactive.event(input.complete_recovery)
    def _complete_recovery():
        user = db.query(db_lib.User).filter_by(id=user_id).first()
        new_pw = input.new_passphrase_recover() or ""
        if not user.passphrase_reset_available_at or user.passphrase_reset_available_at > datetime.utcnow():
            info_msg.set("Recovery cooldown not complete yet.")
            return
        if len(new_pw) < 8:
            info_msg.set("Passphrase must be at least 8 characters.")
            return
        user.parent_passphrase_hash = _hash_passphrase(new_pw)
        user.parent_passphrase_set_at = datetime.utcnow()
        user.passphrase_reset_requested_at = None
        user.passphrase_reset_available_at = None
        db.query(db_lib.ParentPanelSession).filter_by(user_id=user_id).delete()
        db.commit()
        _log("passphrase_recovery_completed")
        auth_ok.set(False)
