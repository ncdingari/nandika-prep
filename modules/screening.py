"""
Diagnostic screening module using the AI diagnostic engine.
"""
from shiny import module, ui, reactive, render

from lib import db as db_lib
from lib.diagnostic import next_diagnostic_step, DIAGNOSTIC_DIMENSIONS


@module.ui
def screening_ui():
    return ui.div(
        ui.output_ui("screening_content"),
    )


@module.server
def screening_server(input, output, session, user_id, db, on_complete):
    current_question = reactive.value(None)
    current_session = reactive.value(1)
    session_done = reactive.value(False)

    def _session_name(sn: int) -> str:
        return {1: "Language and Verbal Reasoning", 2: "Math and Quantitative Reasoning", 3: "Visual and Writing"}\
            .get(sn, "Diagnostic")

    def _determine_session() -> int:
        rows = db.query(db_lib.ScreeningConversation).filter_by(user_id=user_id).all()
        counts = {1: 0, 2: 0, 3: 0}
        for row in rows:
            sn = (row.ai_message or {}).get("session_number")
            if sn in counts:
                counts[sn] += 1
        if counts[1] < 8:
            return 1
        if counts[2] < 8:
            return 2
        if counts[3] < 8:
            return 3
        return 3

    def _load_question():
        sn = _determine_session()
        current_session.set(sn)
        result = next_diagnostic_step(db, user_id, sn)
        if result.get("session_complete"):
            _finalize_session(sn, result)
            session_done.set(True)
            if sn >= 3:
                on_complete()
            return
        current_question.set(result.get("next_question"))

    def _finalize_session(sn: int, result: dict):
        summary = db.query(db_lib.ScreeningSummary).filter_by(user_id=user_id).first()
        if not summary:
            summary = db_lib.ScreeningSummary(user_id=user_id, completed=False)
            db.add(summary)
        if sn >= 3:
            summary.completed = True
            summary.profile_at_completion = result.get("ability_estimates")
            summary.narrative_summary = result.get("qualitative_observations", "")
        db.commit()

    @reactive.effect
    def _init():
        _load_question()

    @output
    @render.ui
    def screening_content():
        if session_done.get():
            sn = current_session.get()
            if sn >= 3:
                return ui.div(ui.HTML("<div class='results-card'>Screening complete. Thank you.</div>"))
            return ui.div(
                ui.HTML(
                    f"<div class='results-card'>Session {sn} complete. Come back for the next session.</div>"
                )
            )
        q = current_question.get()
        if not q:
            return ui.div("Loading...")
        choices = q.get("choices") or []
        if choices:
            buttons = "".join(
                f"<button class='choice-btn' "
                f"onclick=\"Shiny.setInputValue('{session.ns}chosen','{c['id']}',{{priority:'event'}})\">"
                f"<span class='choice-label'>{c['id']}</span> {c.get('label','') or c.get('svg','')}</button>"
                for c in choices
            )
            return ui.HTML(
                f"<div class='question-card'>"
                f"<h3>Session {current_session.get()}: {_session_name(current_session.get())}</h3>"
                f"<div class='question-prompt'>{q.get('prompt','')}</div>"
                f"<div class='choices-grid'>{buttons}</div>"
                f"</div>"
            )
        return ui.div(
            ui.div(
                ui.HTML(
                    f"<h3>Session {current_session.get()}: {_session_name(current_session.get())}</h3>"
                    f"<div class='question-prompt'>{q.get('prompt','')}</div>"
                ),
                ui.input_text("diag_answer", "Your answer"),
                ui.input_action_button("submit_diag", "Next", class_="btn-primary"),
                class_="question-card",
            )
        )

    @reactive.effect
    @reactive.event(input.chosen)
    def _on_choice():
        q = current_question.get()
        if not q:
            return
        chosen = input.chosen()
        result = next_diagnostic_step(db, user_id, current_session.get(), last_question=q, last_answer=chosen)
        if result.get("session_complete"):
            _finalize_session(current_session.get(), result)
            session_done.set(True)
            if current_session.get() >= 3:
                on_complete()
            return
        current_question.set(result.get("next_question"))

    @reactive.effect
    @reactive.event(input.submit_diag)
    def _on_text():
        q = current_question.get()
        if not q:
            return
        ans = input.diag_answer() or ""
        result = next_diagnostic_step(db, user_id, current_session.get(), last_question=q, last_answer=ans)
        if result.get("session_complete"):
            _finalize_session(current_session.get(), result)
            session_done.set(True)
            if current_session.get() >= 3:
                on_complete()
            return
        current_question.set(result.get("next_question"))
