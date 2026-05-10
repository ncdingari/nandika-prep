from datetime import date, timedelta

from lib import db as db_lib
from lib.curriculum import phase_for_user, phase_composition_for, _fallback_question_bank
from lib.question_bank import seed_question_bank
import shared


def test_phase_composition_consistency():
    for phase in [1, 2, 3, 4]:
        comp = phase_composition_for(phase)
        assert "total_questions" in comp
        assert "mix" in comp
        assert sum(comp["mix"].values()) <= comp["total_questions"]


def test_phase_mapping():
    start = date.today() - timedelta(days=7)
    assert phase_for_user(start) in (1, 2)


def test_question_bank_fallback():
    db_lib.create_tables()
    db = shared.SessionLocal()
    try:
        seed_question_bank(db)
        worksheet = {"questions": []}
        patched = _fallback_question_bank(db, worksheet)
        assert len(patched.get("questions", [])) > 0
    finally:
        db.close()
