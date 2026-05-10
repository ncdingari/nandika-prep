"""
Submission module: photo/PDF upload, vision extraction, review UI.
"""
from shiny import module, ui, reactive, render

from lib.vision import extract_answers


@module.ui
def submission_ui():
    return ui.div(
        ui.input_file("upload_file", "Upload worksheet photo or PDF", accept=["image/*", ".pdf"]),
        ui.input_action_button("extract_btn", "Extract Answers", class_="btn-primary"),
        ui.output_ui("submission_review"),
    )


@module.server
def submission_server(input, output, session, user_id, db, questions, on_submit):
    extracted_answers = reactive.value([])

    def _question_meta():
        return [
            {"questionId": q.get("id"), "answer_kind": q.get("answer_kind")}
            for q in questions
        ]

    @reactive.effect
    @reactive.event(input.extract_btn)
    def _extract():
        files = input.upload_file()
        if not files:
            extracted_answers.set([])
            return
        file_info = files[0]
        datapath = file_info.get("datapath")
        if not datapath:
            extracted_answers.set([])
            return
        with open(datapath, "rb") as f:
            raw = f.read()
        filename = file_info.get("name", "").lower()
        if filename.endswith(".pdf"):
            answers = extract_answers(pdf_bytes=raw, question_meta=_question_meta(), db=db, user_id=user_id)
        else:
            answers = extract_answers(image_bytes=raw, question_meta=_question_meta(), db=db, user_id=user_id)
        extracted_answers.set(answers)

    @output
    @render.ui
    def submission_review():
        answers_list = extracted_answers.get()
        if not answers_list:
            return ui.div()
        rows = []
        for item in answers_list:
            qid = item.get("questionId", "?")
            raw_answer = item.get("raw_answer") or ""
            flagged = item.get("flagged", False)
            rows.append(
                ui.tags.tr(
                    ui.tags.td(qid),
                    ui.tags.td(
                        ui.input_text(f"ans_{qid}", None, value=raw_answer)
                    ),
                    ui.tags.td("Low confidence" if flagged else "OK"),
                    class_="flagged" if flagged else None,
                )
            )
        return ui.div(
            ui.tags.h3("Review Extracted Answers"),
            ui.tags.p("Please confirm any low confidence entries."),
            ui.tags.table(
                ui.tags.tr(
                    ui.tags.th("Question"),
                    ui.tags.th("Answer"),
                    ui.tags.th("Status"),
                ),
                *rows,
            ),
            ui.input_action_button("confirm_answers", "Confirm and Grade", class_="btn-primary"),
        )

    @reactive.effect
    @reactive.event(input.confirm_answers)
    def _confirm():
        answers_list = extracted_answers.get()
        if not answers_list:
            return
        ans_dict = {}
        for item in answers_list:
            qid = item.get("questionId")
            if not qid:
                continue
            field_id = f"ans_{qid}"
            if hasattr(input, field_id):
                ans_dict[qid] = getattr(input, field_id)()
            else:
                ans_dict[qid] = ""
        on_submit(ans_dict)
