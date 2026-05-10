import json
import uuid
from datetime import date, datetime, timedelta

from lib.ai import call_ai_json
from lib.cogat_calibrator import validate_cogat_question
from lib.math_verifier import verify_math_question
from lib import db as db_lib
from lib.skills_calendar import get_skill_for_day


PHASE_COMPOSITIONS = {
    1: {
        "total_questions": 12,
        "mix": {
            "cogat-mixed": 3,
            "kumon-math-d": 3,
            "kumon-reading-di": 3,
            "general-reasoning": 2,
            "writing": 1,
        },
    },
    2: {
        "total_questions": 14,
        "mix": {
            "cogat-mixed": 2,
            "kumon-math-d": 5,
            "kumon-reading-di": 4,
            "general-reasoning": 2,
            "writing": 1,
        },
    },
    3: {
        "total_questions": 18,
        "mix": {
            "cogat-mixed": 9,
            "kumon-math-d": 3,
            "kumon-reading-di": 3,
            "general-reasoning": 2,
            "writing": 1,
        },
        "weekly_full_cogat_practice": True,
    },
    4: {
        "total_questions": 8,
        "mix": {
            "cogat-mixed": 4,
            "kumon-math-d": 2,
            "kumon-reading-di": 2,
            "general-reasoning": 0,
            "writing": 0,
        },
    },
}

ENERGY_MULTIPLIERS = {
    "light": {"questions": 0.6, "stretch_ratio": 0.2, "emphasis": "confidence"},
    "regular": {"questions": 1.0, "stretch_ratio": 0.4, "emphasis": "balanced"},
    "big": {"questions": 1.3, "stretch_ratio": 0.6, "emphasis": "growth"},
    "bonus": {"questions": 0.5, "stretch_ratio": 0.3, "emphasis": "specific_dimension"},
}


def phase_for_user(start_date: date, today: date | None = None) -> int:
    today = today or date.today()
    delta_days = max(0, (today - start_date).days)
    week = min(14, delta_days // 7 + 1)
    if week <= 2:
        return 1
    if week <= 8:
        return 2
    if week <= 12:
        return 3
    return 4


def phase_composition_for(phase: int) -> dict:
    return PHASE_COMPOSITIONS.get(phase, PHASE_COMPOSITIONS[2])


def _apply_energy(total: int, energy_level: str) -> int:
    multiplier = ENERGY_MULTIPLIERS.get(energy_level, ENERGY_MULTIPLIERS["regular"])
    adjusted = total * multiplier["questions"]
    return max(4, int(round(adjusted)))


def _skill_for_today(profile: db_lib.Profile | None, day_number: int) -> dict:
    if profile and profile.recent_growth_areas:
        return {
            "name": str(profile.recent_growth_areas[0]),
            "explanation": "We are continuing this focus from yesterday.",
        }
    return get_skill_for_day(day_number)


def _last_7_days_summary(db, user_id: int) -> list[dict]:
    sessions = (
        db.query(db_lib.DailySession)
        .filter_by(user_id=user_id)
        .order_by(db_lib.DailySession.date.desc())
        .limit(7)
        .all()
    )
    summaries = []
    for s in sessions:
        questions = (
            db.query(db_lib.SessionQuestion)
            .filter_by(session_id=s.id)
            .all()
        )
        dims = sorted({q.dimension for q in questions if q.dimension})
        skipped = sum(1 for q in questions if not q.her_answer)
        pct = (s.score_correct / s.score_total) if s.score_total else 0
        summaries.append(
            {
                "date": s.date.isoformat(),
                "score_pct": pct,
                "dimensions": dims,
                "duration_min": (s.duration_seconds or 0) / 60,
                "skipped_questions": skipped,
            }
        )
    return summaries


def _recent_math_context(db, user_id: int, days: int = 3) -> list[dict]:
    since = date.today() - timedelta(days=days)
    sessions = (
        db.query(db_lib.DailySession)
        .filter(db_lib.DailySession.user_id == user_id)
        .filter(db_lib.DailySession.date >= since)
        .order_by(db_lib.DailySession.date.desc())
        .all()
    )
    out = []
    for s in sessions:
        progress = db.query(db_lib.SessionProgress).filter_by(session_id=s.id).first()
        if not progress:
            continue
        out.append(
            {
                "date": s.date.isoformat(),
                "intermediate_work": progress.intermediate_work or {},
                "time_per_question": progress.time_per_question or {},
            }
        )
    return out


def _missed_yesterday(db, user_id: int) -> tuple[bool, list[str]]:
    yesterday = date.today() - timedelta(days=1)
    sessions = (
        db.query(db_lib.DailySession)
        .filter_by(user_id=user_id, date=yesterday, session_type="daily")
        .all()
    )
    if sessions:
        return False, []
    last_questions = (
        db.query(db_lib.SessionQuestion)
        .join(db_lib.DailySession, db_lib.SessionQuestion.session_id == db_lib.DailySession.id)
        .filter(db_lib.DailySession.user_id == user_id)
        .order_by(db_lib.DailySession.date.desc())
        .limit(20)
        .all()
    )
    dims = sorted({q.dimension for q in last_questions if q.dimension})
    return True, dims[:4]


def generate_worksheet(
    db,
    user_id: int,
    energy_level: str = "regular",
    session_type: str = "daily",
    bonus_focus: str | None = None,
) -> tuple[dict, str]:
    user = db.query(db_lib.User).filter_by(id=user_id).first()
    profile = db_lib.get_profile(db, user_id)
    phase = phase_for_user(user.start_date)
    composition = phase_composition_for(phase)
    total_questions = _apply_energy(composition["total_questions"], energy_level)
    if energy_level == "bonus":
        total_questions = max(5, min(8, total_questions))

    today = date.today()
    day_number = max(1, (today - user.start_date).days + 1)
    skill = _skill_for_today(profile, day_number)

    parent_nudges = (
        db.query(db_lib.ParentNudge)
        .filter_by(user_id=user_id, active=True)
        .filter(
            (db_lib.ParentNudge.expires_at.is_(None))
            | (db_lib.ParentNudge.expires_at > datetime.utcnow())
        )
        .all()
    )
    missed_yesterday, missed_dims = _missed_yesterday(db, user_id)

    user_content = json.dumps(
        {
            "today": today.isoformat(),
            "phase": phase,
            "current_streak_days": 0,
            "ability_profile": profile.ability_estimates if profile else {},
            "goal_weights": profile.goal_weights if profile else {},
            "parent_nudges_active": [n.nudge_text for n in parent_nudges],
            "recent_strengths": profile.recent_strengths if profile else [],
            "recent_growth_areas": profile.recent_growth_areas if profile else [],
            "last_7_days_summary": _last_7_days_summary(db, user_id),
            "todays_target_composition": composition["mix"],
            "todays_target_total_questions": total_questions,
            "parent_notes": profile.parent_notes if profile else "",
            "energy_level": energy_level,
            "energy_emphasis": ENERGY_MULTIPLIERS.get(energy_level, {}).get("emphasis"),
            "recent_math_work": _recent_math_context(db, user_id),
            "bonus_focus": bonus_focus,
            "missed_yesterday": missed_yesterday,
            "missed_dimensions_emphasis": missed_dims,
        }
    )

    system_prompt = (
        "You are the curriculum engine for NandikaPrep, a personal AI tutor for Nandika, "
        "a 6 year old girl finishing 1st grade and rising to 2nd grade. She is academically "
        "advanced but is preparing for the Florida Gifted screening administered to Grade 2 students. "
        "Generate a worksheet as strict JSON with the specified fields."
    )
    worksheet, provider = call_ai_json(system_prompt, user_content, db=db, user_id=user_id)
    if not worksheet:
        worksheet = _offline_worksheet(phase, skill, total_questions, energy_level, session_type, bonus_focus)
    else:
        worksheet = _validate_and_patch(db, worksheet)
    return worksheet, provider


def _offline_worksheet(
    phase: int,
    skill: dict,
    total_questions: int,
    energy_level: str,
    session_type: str,
    bonus_focus: str | None,
) -> dict:
    introduction = "Ready for a calm session today, Nandika." if energy_level == "light" else "Ready for today's puzzles, Nandika."
    if energy_level == "big":
        introduction = "You're feeling strong today. I have some stretch questions for you."
    worksheet_id = str(uuid.uuid4())
    questions = []
    for i in range(total_questions):
        q_id = f"q{i+1}"
        if bonus_focus == "math":
            dimension = "kumon-math-d-multiplication"
        elif bonus_focus == "reading":
            dimension = "kumon-reading-di-main-idea"
        else:
            dimension = "cogat-number-analogies" if i % 3 == 0 else "kumon-math-d-division"
        prompt = "12 x 4" if "multiplication" in dimension else "48 ÷ 6"
        expected = "48" if "multiplication" in dimension else "8"
        questions.append(
            {
                "id": q_id,
                "dimension": dimension,
                "subtype": "",
                "prompt": prompt,
                "prompt_audio_text": prompt,
                "visual_svg": None,
                "choices": None,
                "expected_answer": expected,
                "answer_kind": "number",
                "correctness_rules": {"accept_equivalents": False, "case_sensitive": False, "min_length_chars": None},
                "difficulty_estimate": 0.4,
                "skill_targeted": skill["name"],
                "explanation_for_correct": "Nice work.",
                "explanation_for_incorrect": "Check the operation and try again.",
                "quality_self_rating": 0.9,
            }
        )
    return {
        "phase": phase,
        "session_id": worksheet_id,
        "introduction": introduction,
        "todays_new_skill": {"name": skill["name"], "explanation": skill["description"] if "description" in skill else skill["explanation"]},
        "questions": questions,
        "encouragement_for_completion": "Well done. See you tomorrow.",
    }


def _validate_and_patch(db, worksheet: dict) -> dict:
    questions = worksheet.get("questions", [])
    valid_questions = []
    rejected = 0
    for q in questions:
        quality = q.get("quality_self_rating", 1.0)
        if quality < 0.7:
            rejected += 1
            continue
        dimension = q.get("dimension", "")
        if dimension.startswith("cogat-"):
            ok, _ = validate_cogat_question(q)
            if not ok:
                rejected += 1
                continue
        if verify_math_question(dimension, q.get("prompt", ""), q.get("expected_answer", "")) is False:
            q["verification_failed"] = True
            rejected += 1
            continue
        valid_questions.append(q)

    if questions and rejected / len(questions) > 0.30:
        return _fallback_question_bank(db, worksheet)

    worksheet["questions"] = valid_questions
    return worksheet


def _fallback_question_bank(db, worksheet: dict) -> dict:
    bank = db.query(db_lib.QuestionBank).limit(10).all()
    questions = []
    for idx, row in enumerate(bank[: max(4, len(bank))]):
        questions.append(
            {
                "id": f"bank-{idx}",
                "dimension": row.dimension,
                "subtype": "",
                "prompt": row.prompt,
                "prompt_audio_text": row.prompt,
                "visual_svg": None,
                "choices": row.question_payload.get("choices") if row.question_payload else None,
                "expected_answer": row.expected_answer,
                "answer_kind": row.question_payload.get("answer_kind", "letter") if row.question_payload else "letter",
                "correctness_rules": row.question_payload.get("correctness_rules") if row.question_payload else {},
                "difficulty_estimate": row.question_payload.get("difficulty_estimate", 0.5) if row.question_payload else 0.5,
                "skill_targeted": row.question_payload.get("skill_targeted", "") if row.question_payload else "",
                "explanation_for_correct": row.question_payload.get("explanation_for_correct", "") if row.question_payload else "",
                "explanation_for_incorrect": row.question_payload.get("explanation_for_incorrect", "") if row.question_payload else "",
                "quality_self_rating": row.quality_score or 0.9,
            }
        )
    worksheet["questions"] = questions
    return worksheet


def update_profile_after_session(db, user_id: int, report, questions: list[dict]) -> None:
    profile = db_lib.get_profile(db, user_id)
    ability = profile.ability_estimates if profile else {}
    system = (
        "You are updating Nandika's ability profile. Given today's session results and her prior "
        "profile, output the updated profile JSON with ability_estimates, recent_strengths, "
        "recent_growth_areas, and tomorrow_emphasis."
    )
    user_content = json.dumps(
        {
            "prior_profile": ability,
            "score_pct": report.percentage if report else 0,
            "questions": questions,
            "results": [
                {
                    "question_id": r.question_id,
                    "dimension": r.dimension,
                    "is_correct": r.is_correct,
                    "correctness_kind": r.correctness_kind,
                }
                for r in report.results
            ]
            if report
            else [],
        }
    )
    updated, _ = call_ai_json(system, user_content, db=db, user_id=user_id)
    if not updated:
        updated = {
            "ability_estimates": ability,
            "recent_strengths": ["Stayed focused during the session"],
            "recent_growth_areas": ["Accuracy on multi step reasoning"],
            "tomorrow_emphasis": "Practice one more reasoning set",
        }
    growth = list(updated.get("recent_growth_areas", []))
    tomorrow = updated.get("tomorrow_emphasis")
    if tomorrow:
        growth = [tomorrow] + growth
    db_lib.upsert_profile(
        db,
        user_id,
        ability_estimates=updated.get("ability_estimates", ability),
        recent_strengths=updated.get("recent_strengths", []),
        recent_growth_areas=growth,
    )
