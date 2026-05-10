"""
Home dashboard for NandikaPrep V2.
Includes energy selection, resume prompt, and My Progress view.
"""
from datetime import date, timedelta, datetime
import json

from shiny import module, ui, reactive, render

from lib import db as db_lib
from lib.skills_calendar import get_skill_for_day


def _mastery_tree_svg(level: int, color: str, label: str) -> str:
    leaves = min(level, 12)
    leaf_html = ""
    for i in range(12):
        cls = "leaf-filled" if i < leaves else "leaf-empty"
        row, col = divmod(i, 3)
        x = 10 + col * 22
        y = 8 + row * 22
        leaf_html += (
            f'<circle cx="{x}" cy="{y}" r="9" class="{cls}" '
            f'fill="{color if i < leaves else "#EEE"}" stroke="white" stroke-width="1"/>'
            f'<text x="{x}" y="{y+4}" font-size="8" text-anchor="middle" '
            f'fill="{"white" if i < leaves else "#AAA"}">{i+1}</text>'
        )
    return (
        f'<svg width="76" height="100" xmlns="http://www.w3.org/2000/svg">'
        f'{leaf_html}'
        f'<rect x="30" y="94" width="16" height="6" rx="2" fill="#8B4513"/>'
        f'<text x="38" y="110" font-size="9" text-anchor="middle" fill="#555">{label}</text>'
        f'</svg>'
    )


@module.ui
def home_ui():
    return ui.div(
        ui.output_ui("home_content"),
    )


@module.server
def home_server(
    input,
    output,
    session,
    user_id: int,
    db,
    on_start_daily=None,
    on_resume=None,
    on_open_parent=None,
    on_open_progress=None,
    device_role: str = "student",
    **kwargs,
):
    show_progress = reactive.value(False)
    selected_energy = reactive.value(None)

    def _streak_days() -> int:
        today = date.today()
        streak = 0
        misses = 0
        for i in range(365):
            day = today - timedelta(days=i)
            count = db.query(db_lib.DailySession).filter_by(
                user_id=user_id, date=day, session_type="daily"
            ).count()
            if count == 0:
                misses += 1
                if misses > 2:
                    break
                continue
            streak += 1
        return streak

    def _total_questions() -> int:
        return db.query(db_lib.SessionQuestion).join(db_lib.DailySession).filter(
            db_lib.DailySession.user_id == user_id
        ).count()

    def _days_using_app() -> int:
        return db.query(db_lib.DailySession.date).filter_by(user_id=user_id).distinct().count()

    def _badges():
        return db.query(db_lib.Badge).filter_by(user_id=user_id).order_by(db_lib.Badge.unlocked_at.desc()).all()

    def _kumon_levels():
        progress = db_lib.get_all_progress(db, user_id)
        math = progress.get("kumon-math", db_lib.Progress(current_level=4)).current_level
        reading = progress.get("kumon-reading", db_lib.Progress(current_level=4)).current_level
        return math, reading

    def _recent_writing():
        return (
            db.query(db_lib.WritingSample)
            .filter_by(user_id=user_id)
            .order_by(db_lib.WritingSample.created_at.desc())
            .limit(5)
            .all()
        )

    def _in_progress_session():
        row = (
            db.query(db_lib.SessionProgress)
            .join(db_lib.DailySession, db_lib.SessionProgress.session_id == db_lib.DailySession.id)
            .filter(db_lib.DailySession.user_id == user_id)
            .filter(db_lib.SessionProgress.is_finalized == False)
            .order_by(db_lib.SessionProgress.started_at.desc())
            .first()
        )
        if not row:
            return None
        if (datetime.utcnow() - row.started_at) > timedelta(hours=48):
            row.is_finalized = True
            db.commit()
            return None
        return row

    def _parent_settings():
        profile = db_lib.get_profile(db, user_id)
        if not profile or not profile.parent_notes:
            return {}
        try:
            parsed = json.loads(profile.parent_notes)
            return parsed.get("settings", {}) if isinstance(parsed, dict) else {}
        except Exception:
            return {}

    def _missed_days() -> int:
        today = date.today()
        missed = 0
        for i in range(1, 5):
            day = today - timedelta(days=i)
            count = db.query(db_lib.DailySession).filter_by(user_id=user_id, date=day, session_type="daily").count()
            if count == 0:
                missed += 1
            else:
                break
        return missed

    @output
    @render.ui
    def home_content():
        if show_progress.get():
            return _progress_view()

        resume = _in_progress_session()
        if resume:
            return _resume_view(resume)

        missed = _missed_days()
        if missed >= 3:
            return ui.div(
                ui.HTML(
                    "<div class='question-card'>"
                    "<div class='question-prompt'>Welcome back! Want to do a quick refresher to get warmed up?</div>"
                    "</div>"
                ),
                ui.input_action_button("start_refresher", "Yes, short refresher", class_="btn-primary btn-big"),
                ui.input_action_button("skip_refresher", "Skip to today's puzzles", class_="btn-secondary btn-big"),
            )

        day_num = max(1, _days_using_app())
        skill = get_skill_for_day(day_num)
        gear_html = (
            f"<span class='gear-icon' onclick=\"Shiny.setInputValue('{session.ns}open_parent', 1, {{priority:'event'}})\">&#9881;</span>"
            if device_role == "parent"
            else ""
        )
        settings = _parent_settings()
        disable_energy = settings.get("disable_energy", False)
        default_energy = settings.get("default_energy", "regular")
        if settings.get("today_energy_override"):
            selected_energy.set(settings.get("today_energy_override"))
        elif selected_energy.get() is None:
            selected_energy.set(default_energy)

        energy_section = ui.div(
            ui.div(
                ui.HTML("<div class='question-prompt'>How are you feeling today, Nandika?</div>")
            ),
            ui.div(
                ui.input_action_button("energy_light", "🌱 Light day", class_="energy-btn energy-light"),
                ui.input_action_button("energy_regular", "🌳 Regular day", class_="energy-btn energy-regular"),
                ui.input_action_button("energy_big", "🌟 Big day", class_="energy-btn energy-big"),
                class_="energy-grid",
            ),
        ) if not disable_energy else ui.div()

        return ui.div(
            ui.div(
                ui.HTML(
                    f"<div class='home-header'>"
                    f"<span class='owl-mascot'>&#129417;</span>"
                    f"<h1>Hello, Nandika!</h1>"
                    f"{gear_html}"
                    f"</div>"
                )
            ),
            energy_section,
            ui.div(
                ui.input_action_button("start_daily", "Start Today's Challenge", class_="btn-primary btn-big")
            ),
            ui.div(
                ui.input_action_button("open_progress", "My Progress", class_="btn-secondary btn-big"),
            ),
            ui.div(
                ui.HTML(
                    f"<div class='skill-callout'><strong>New Today, Nandika!</strong> {skill['name']}: {skill['description']}</div>"
                )
            ),
        )

    def _progress_view():
        streak = _streak_days()
        total_q = _total_questions()
        days = _days_using_app()
        math_lvl, read_lvl = _kumon_levels()
        math_tree = _mastery_tree_svg(math_lvl, "#4A90E2", "Math")
        read_tree = _mastery_tree_svg(read_lvl, "#27AE60", "Reading")
        badges = _badges()
        writing = _recent_writing()
        skills = [get_skill_for_day(days + i) for i in range(1, 8)]
        skills_rows = "".join(
            f"<li>{s['name']}: {s['description']}</li>" for s in skills
        )
        badge_rows = "".join(
            f"<li>{b.badge_code} ({b.unlocked_at.date().isoformat()})</li>" for b in badges
        ) or "<li>No badges yet.</li>"
        writing_rows = "".join(
            f"<li>{w.encouragement or 'Nice work.'}</li>" for w in writing
        ) or "<li>No writing samples yet.</li>"
        return ui.HTML(
            f"<div class='question-card'>"
            f"<h2>My Progress</h2>"
            f"<p>Streak: {streak} days &#128293;</p>"
            f"<p>Total questions answered: {total_q}</p>"
            f"<p>Days using the app: {days}</p>"
            f"<h3>Badges</h3><ul>{badge_rows}</ul>"
            f"<h3>Kumon Levels</h3><p>Math Level {math_lvl} | Reading Level {read_lvl}</p>"
            f"<div class='mastery-trees'>{math_tree}{read_tree}</div>"
            f"<h3>Recent Writing</h3><ul>{writing_rows}</ul>"
            f"<h3>Skills Calendar</h3><ul>{skills_rows}</ul>"
            f"</div>"
            f"<button class='btn-ghost btn-big' onclick=\"Shiny.setInputValue('{session.ns}back_home', 1, {{priority:'event'}})\">Back</button>"
        )

    def _resume_view(resume_row: db_lib.SessionProgress):
        sess = db.query(db_lib.DailySession).filter_by(id=resume_row.session_id).first()
        total = len((sess.worksheet_payload or {}).get("questions", [])) if sess else 0
        idx = resume_row.current_index or 0
        progress = f"{idx} of {total}" if total else "In progress"
        return ui.HTML(
            f"<div class='question-card'>"
            f"<div class='question-prompt'>Welcome back, Nandika. You were on question {progress}. Ready to keep going?</div>"
            f"<button class='btn-primary btn-big' onclick=\"Shiny.setInputValue('{session.ns}resume_session', {resume_row.session_id}, {{priority:'event'}})\">Continue</button>"
            f"<button class='btn-ghost btn-big' onclick=\"if(confirm('Start fresh today? Yesterday\\'s progress will still be in history, but a new worksheet will be generated.')) Shiny.setInputValue('{session.ns}start_fresh', 1, {{priority:'event'}})\">Start fresh today</button>"
            f"</div>"
        )

    @reactive.effect
    @reactive.event(input.open_progress)
    def _open_progress():
        show_progress.set(True)
        if on_open_progress:
            on_open_progress()

    @reactive.effect
    @reactive.event(input.back_home)
    def _back_home():
        show_progress.set(False)

    @reactive.effect
    @reactive.event(input.start_daily)
    def _start_daily():
        energy = selected_energy.get() or "regular"
        if on_start_daily:
            on_start_daily(energy)

    @reactive.effect
    @reactive.event(input.energy_light)
    def _energy_light():
        selected_energy.set("light")
        session.send_custom_message("set_energy_choice", {"value": "light"})

    @reactive.effect
    @reactive.event(input.energy_regular)
    def _energy_regular():
        selected_energy.set("regular")
        session.send_custom_message("set_energy_choice", {"value": "regular"})

    @reactive.effect
    @reactive.event(input.energy_big)
    def _energy_big():
        selected_energy.set("big")
        session.send_custom_message("set_energy_choice", {"value": "big"})

    @reactive.effect
    @reactive.event(input.resume_session)
    def _resume():
        if on_resume:
            on_resume(input.resume_session())

    @reactive.effect
    @reactive.event(input.start_fresh)
    def _start_fresh():
        if on_start_daily:
            on_start_daily("regular")

    @reactive.effect
    @reactive.event(input.open_parent)
    def _open_parent():
        if on_open_parent:
            on_open_parent()

    @reactive.effect
    @reactive.event(input.start_refresher)
    def _start_refresher():
        if on_start_daily:
            on_start_daily("light")

    @reactive.effect
    @reactive.event(input.skip_refresher)
    def _skip_refresher():
        if on_start_daily:
            on_start_daily("regular")

    @reactive.effect
    def _load_energy_choice():
        session.send_custom_message("get_energy_choice", {"input_id": session.ns("energy_choice")})
        session.send_custom_message(
            "read_aloud",
            {"text": "How are you feeling today, Nandika?", "rate": 0.95},
        )

    @reactive.effect
    @reactive.event(input.energy_choice)
    def _on_energy_choice():
        value = input.energy_choice()
        if value:
            selected_energy.set(value)
