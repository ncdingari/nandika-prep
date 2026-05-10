"""
Daily session module for AI-generated worksheets.
Handles resume, in-progress saving, grading, and bonus sessions.
"""
from datetime import datetime
import time

from shiny import module, ui, reactive, render

from lib import db as db_lib
from lib.curriculum import generate_worksheet, update_profile_after_session
from lib.grader import grade_session
from lib.ai import call_ai_json


@module.ui
def daily_session_ui():
    return ui.div(
        ui.div(id="daily-intro"),
        ui.output_ui("daily_question_area"),
        ui.output_ui("daily_results_area"),
    )


@module.server
def daily_session_server(
    input,
    output,
    session,
    user_id: int,
    db,
    energy_level: str = "regular",
    session_type: str = "daily",
    resume_session_id: int | None = None,
    on_complete=None,
    on_bonus=None,
    bonus_enabled: bool = True,
    bonus_focus: str | None = None,
):
    questions = reactive.value([])
    answers = reactive.value({})
    current_index = reactive.value(0)
    session_row = reactive.value(None)
    results_report = reactive.value(None)
    question_start = reactive.value(time.time())
    submission_mode = reactive.value("digital")

    def _load_or_start():
        if resume_session_id:
            sess = db.query(db_lib.DailySession).filter_by(id=resume_session_id).first()
            prog = db.query(db_lib.SessionProgress).filter_by(session_id=resume_session_id).first()
            if sess and prog:
                session_row.set(sess)
                questions.set(sess.worksheet_payload.get("questions", []))
                answers.set(prog.answers_so_far or {})
                current_index.set(prog.current_index or 0)
                return
        worksheet, provider = generate_worksheet(
            db,
            user_id,
            energy_level=energy_level,
            session_type=session_type,
            bonus_focus=bonus_focus,
        )
        sess = db_lib.DailySession(
            user_id=user_id,
            date=datetime.utcnow().date(),
            phase=worksheet.get("phase", 2),
            session_type=session_type,
            worksheet_payload=worksheet,
            ai_provider=provider,
            energy_level=energy_level,
        )
        db.add(sess)
        db.commit()
        db.refresh(sess)
        session_row.set(sess)
        questions.set(worksheet.get("questions", []))
        answers.set({})
        current_index.set(0)
        _ensure_progress_row(sess.id)
        _render_intro(worksheet)

    def _ensure_progress_row(session_id: int):
        row = db.query(db_lib.SessionProgress).filter_by(session_id=session_id).first()
        if not row:
            row = db_lib.SessionProgress(session_id=session_id)
            db.add(row)
            db.commit()

    def _render_intro(worksheet: dict):
        intro = worksheet.get("introduction", "")
        skill = worksheet.get("todays_new_skill", {})
        skill_html = ""
        if skill:
            skill_html = (
                f'<div class="skill-callout">'
                f'<strong>New Today, Nandika!</strong> {skill.get("name","")}: {skill.get("explanation","")}'
                f"</div>"
            )
        session.send_custom_message(
            "update_html",
            {"id": "daily-intro", "html": f"<div class='intro-text'>{intro}</div>{skill_html}"},
        )

    @reactive.effect
    def _init():
        _load_or_start()

    @reactive.effect
    def _init_submission():
        if not questions.get():
            return
        from modules.submission import submission_server
        submission_server(
            "submission",
            user_id=user_id,
            db=db,
            questions=questions.get(),
            on_submit=_handle_upload_submit,
        )

    def _save_progress(qid: str, answer_value: str):
        sess = session_row.get()
        if not sess:
            return
        row = db.query(db_lib.SessionProgress).filter_by(session_id=sess.id).first()
        if not row:
            row = db_lib.SessionProgress(session_id=sess.id)
            db.add(row)
        ans = dict(row.answers_so_far or {})
        ans[qid] = answer_value
        row.answers_so_far = ans
        row.current_index = current_index.get() + 1
        elapsed = max(1, int(time.time() - question_start.get()))
        times = dict(row.time_per_question or {})
        times[qid] = elapsed
        row.time_per_question = times
        row.last_activity_at = datetime.utcnow()
        db.commit()

    def _save_work(qid: str, work_text: str):
        sess = session_row.get()
        if not sess:
            return
        row = db.query(db_lib.SessionProgress).filter_by(session_id=sess.id).first()
        if not row:
            row = db_lib.SessionProgress(session_id=sess.id)
            db.add(row)
        work = dict(row.intermediate_work or {})
        work[qid] = work_text
        row.intermediate_work = work
        row.last_activity_at = datetime.utcnow()
        db.commit()

    def _advance():
        idx = current_index.get() + 1
        current_index.set(idx)
        question_start.set(time.time())

    @output
    @render.ui
    def daily_question_area():
        if results_report.get() is not None:
            return ui.div()
        qs = questions.get()
        mode_switch = ui.div(
            ui.input_action_button("mode_digital", "Digital tap", class_="btn-secondary"),
            ui.input_action_button("mode_upload", "Upload photo or PDF", class_="btn-secondary"),
        )
        if submission_mode.get() == "upload":
            from modules.submission import submission_ui
            return ui.div(mode_switch, submission_ui("submission"))
        idx = current_index.get()
        if idx >= len(qs):
            return ui.div(
                ui.input_action_button("submit_session", "Submit", class_="btn-primary btn-big")
            )
        q = qs[idx]
        prompt = q.get("prompt", "")
        visual = q.get("visual_svg")
        choices = q.get("choices") or []
        visual_html = f"<div class='question-svg'>{visual}</div>" if visual else ""
        if choices:
            buttons = "".join(
                f"<button class='choice-btn' "
                f"onclick=\"Shiny.setInputValue('{session.ns}chosen','{c['id']}',{{priority:'event'}})\">"
                f"<span class='choice-label'>{c['id']}</span> {c.get('label','') or c.get('svg','')}</button>"
                for c in choices
            )
            return ui.HTML(
                f"<div class='question-card'>"
                f"<div class='progress-text'>Question {idx+1} of {len(qs)}</div>"
                f"{visual_html}"
                f"<div class='question-prompt'>{prompt}</div>"
                f"<div class='choices-grid'>{buttons}</div>"
                f"</div>"
            )
        return ui.div(
            ui.div(
                ui.HTML(
                    f"<div class='progress-text'>Question {idx+1} of {len(qs)}</div>"
                    f"{visual_html}"
                    f"<div class='question-prompt'>{prompt}</div>"
                ),
                ui.input_text("free_answer", "Your answer", value="", placeholder="Type here"),
                ui.input_text_area("show_work", "Show your work (optional)", value=""),
                ui.input_action_button("submit_free", "Next", class_="btn-primary"),
                class_="question-card",
            )
        )

    @reactive.effect
    @reactive.event(input.chosen)
    def _on_choice():
        qs = questions.get()
        idx = current_index.get()
        if idx >= len(qs):
            return
        qid = qs[idx].get("id")
        chosen = input.chosen()
        ans = dict(answers.get())
        ans[qid] = chosen
        answers.set(ans)
        _save_progress(qid, chosen)
        _advance()

    @reactive.effect
    @reactive.event(input.submit_free)
    def _on_free():
        qs = questions.get()
        idx = current_index.get()
        if idx >= len(qs):
            return
        qid = qs[idx].get("id")
        her = input.free_answer() or ""
        work = input.show_work() or ""
        ans = dict(answers.get())
        ans[qid] = her
        answers.set(ans)
        _save_progress(qid, her)
        if work:
            _save_work(qid, work)
        _advance()

    @reactive.effect
    @reactive.event(input.mode_digital)
    def _mode_digital():
        submission_mode.set("digital")

    @reactive.effect
    @reactive.event(input.mode_upload)
    def _mode_upload():
        submission_mode.set("upload")

    def _finalize_submission():
        qs = questions.get()
        ans = answers.get()
        report = grade_session(qs, ans, db=db, user_id=user_id)
        results_report.set(report)
        sess = session_row.get()
        if sess:
            sess.score_correct = report.score_correct
            sess.score_total = report.score_total
            prog = db.query(db_lib.SessionProgress).filter_by(session_id=sess.id).first()
            sess.duration_seconds = sum((prog.time_per_question or {}).values()) if prog else 0
            db.commit()
            _finalize_session(sess.id, report)
            update_profile_after_session(db, user_id, report, qs)
        if on_complete:
            on_complete()

    @reactive.effect
    @reactive.event(input.submit_session)
    def _on_submit():
        _finalize_submission()

    def _handle_upload_submit(ans_dict: dict):
        answers.set(ans_dict)
        _finalize_submission()

    def _finalize_session(session_id: int, report):
        prog = db.query(db_lib.SessionProgress).filter_by(session_id=session_id).first()
        if prog:
            prog.is_finalized = True
            db.commit()
        for r in report.results:
            row = db_lib.SessionQuestion(
                session_id=session_id,
                question_id=r.question_id,
                dimension=r.dimension,
                expected_answer=r.expected_answer,
                her_answer=r.her_answer,
                is_correct=r.is_correct,
                correctness_kind=r.correctness_kind,
                ai_evaluation=r.ai_evaluation,
                explanation=r.explanation,
                question_payload={},
            )
            db.add(row)
        db.commit()

    @output
    @render.ui
    def daily_results_area():
        report = results_report.get()
        if report is None:
            return ui.div()
        pct = int(report.percentage * 100) if report.score_total else 0
        bonus_block = ui.div(
            ui.input_action_button("bonus_math", "Yes, more math", class_="btn-secondary btn-big"),
            ui.input_action_button("bonus_read", "Yes, more reading", class_="btn-secondary btn-big"),
            ui.input_action_button("bonus_surprise", "Yes, surprise me", class_="btn-secondary btn-big"),
            ui.input_action_button("bonus_done", "No, all done", class_="btn-ghost btn-big"),
        ) if bonus_enabled else ui.div(
            ui.input_action_button("bonus_done", "All done", class_="btn-ghost btn-big")
        )
        return ui.div(
            ui.div(
                ui.HTML(
                    f"<div class='results-card'>"
                    f"<div class='score-display'>{pct}%</div>"
                    f"<div class='cheer'>Well done today.</div>"
                    f"</div>"
                )
            ),
            bonus_block,
        )

    @reactive.effect
    @reactive.event(input.bonus_math)
    def _bonus_math():
        if on_bonus:
            on_bonus("math")

    @reactive.effect
    @reactive.event(input.bonus_read)
    def _bonus_read():
        if on_bonus:
            on_bonus("reading")

    @reactive.effect
    @reactive.event(input.bonus_surprise)
    def _bonus_surprise():
        if on_bonus:
            on_bonus(None)

    @reactive.effect
    @reactive.event(input.bonus_done)
    def _bonus_done():
        if on_complete:
            on_complete()
