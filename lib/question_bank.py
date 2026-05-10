from datetime import datetime

from lib import db as db_lib


def seed_question_bank(db) -> None:
    if db.query(db_lib.QuestionBank).count() > 0:
        return
    samples = [
        {
            "dimension": "cogat-number-analogies",
            "difficulty": 5,
            "prompt": "2 : 4 :: 3 : ?",
            "expected_answer": "6",
            "question_payload": {"answer_kind": "number"},
            "quality_score": 0.9,
        },
        {
            "dimension": "kumon-math-d-multiplication",
            "difficulty": 6,
            "prompt": "12 x 4",
            "expected_answer": "48",
            "question_payload": {"answer_kind": "number"},
            "quality_score": 0.9,
        },
        {
            "dimension": "kumon-reading-di-main-idea",
            "difficulty": 6,
            "prompt": "What is the main idea of this short paragraph?",
            "expected_answer": "A short main idea.",
            "question_payload": {"answer_kind": "text"},
            "quality_score": 0.8,
        },
    ]
    for s in samples:
        db.add(
            db_lib.QuestionBank(
                dimension=s["dimension"],
                difficulty=s["difficulty"],
                prompt=s["prompt"],
                expected_answer=s["expected_answer"],
                question_payload=s["question_payload"],
                quality_score=s["quality_score"],
                last_used=None,
            )
        )
    db.commit()


def fetch_questions(db, dimension: str, difficulty: int, limit: int = 2) -> list[db_lib.QuestionBank]:
    return (
        db.query(db_lib.QuestionBank)
        .filter_by(dimension=dimension, difficulty=difficulty)
        .limit(limit)
        .all()
    )


def touch_question(db, row: db_lib.QuestionBank) -> None:
    row.times_used = (row.times_used or 0) + 1
    row.last_used = datetime.utcnow()
    db.commit()
