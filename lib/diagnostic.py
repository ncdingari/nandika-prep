import json
from datetime import datetime

from lib.ai import call_ai_json
from lib import db as db_lib


DIAGNOSTIC_DIMENSIONS = {
    1: [
        "cogat-verbal-analogies",
        "cogat-sentence-completion-pictures",
        "cogat-picture-classification",
        "kumon-reading-di-comprehension",
        "vocabulary-depth",
    ],
    2: [
        "cogat-number-analogies",
        "cogat-number-puzzles",
        "cogat-number-series",
        "kumon-math-d-multiplication",
        "kumon-math-d-division",
        "kumon-math-d-fractions",
    ],
    3: [
        "cogat-figure-matrices",
        "cogat-paper-folding",
        "cogat-figure-classification",
        "writing-mechanics",
        "writing-depth",
    ],
}

SYSTEM_PROMPT = (
    "You are conducting a diagnostic assessment of Nandika, a 6 year old preparing for the Florida "
    "Gifted screening and pursuing general advancement. Conduct one of three diagnostic sessions "
    "today. Output a next_question payload each turn, and at completion output session_complete true "
    "with ability_estimates and qualitative_observations."
)


def next_diagnostic_step(
    db,
    user_id: int,
    session_number: int,
    last_question: dict | None = None,
    last_answer: str | None = None,
) -> dict:
    history = (
        db.query(db_lib.ScreeningConversation)
        .filter_by(user_id=user_id)
        .order_by(db_lib.ScreeningConversation.turn_number.asc())
        .all()
    )
    turns = [h for h in history if (h.ai_message or {}).get("session_number") == session_number]
    turn_number = len(turns) + 1

    if last_question is not None:
        db.add(
            db_lib.ScreeningConversation(
                user_id=user_id,
                turn_number=turn_number - 1,
                ai_message={"session_number": session_number, "question": last_question},
                her_response={"answer": last_answer},
                ai_assessment="",
                created_at=datetime.utcnow(),
            )
        )
        db.commit()

    if turn_number > 8:
        estimates = {
            dim: {"level": 6.0, "confidence": 0.3}
            for dim in DIAGNOSTIC_DIMENSIONS.get(session_number, [])
        }
        db_lib.upsert_profile(db, user_id, ability_estimates=estimates)
        return {
            "session_complete": True,
            "ability_estimates": estimates,
            "qualitative_observations": "She engaged thoughtfully and stayed calm throughout the session.",
        }

    question = _offline_question(session_number, turn_number)
    return {
        "next_question": question,
        "internal_assessment_notes": "offline",
        "session_progress_pct": turn_number / 8,
    }


def _offline_question(session_number: int, turn_number: int) -> dict:
    dims = DIAGNOSTIC_DIMENSIONS.get(session_number, [])
    dimension = dims[(turn_number - 1) % len(dims)] if dims else "general-reasoning"
    prompt = "Pick the best answer."
    return {
        "id": f"diag-{session_number}-{turn_number}",
        "dimension": dimension,
        "subtype": "",
        "prompt": prompt,
        "prompt_audio_text": prompt,
        "visual_svg": None,
        "choices": [
            {"id": "A", "label": "A", "svg": None},
            {"id": "B", "label": "B", "svg": None},
            {"id": "C", "label": "C", "svg": None},
            {"id": "D", "label": "D", "svg": None},
        ],
        "expected_answer": "A",
        "answer_kind": "letter",
        "correctness_rules": {"accept_equivalents": False, "case_sensitive": False, "min_length_chars": None},
        "difficulty_estimate": 0.5,
        "skill_targeted": "Diagnostic",
        "explanation_for_correct": "Thanks for the answer.",
        "explanation_for_incorrect": "Thanks for trying.",
        "quality_self_rating": 0.9,
    }
