from __future__ import annotations

from dataclasses import dataclass, field
import json
import math
import re

from lib.ai import call_ai_json


@dataclass
class QuestionGrade:
    question_id: str
    dimension: str
    expected_answer: str
    her_answer: str | None
    is_correct: bool
    correctness_kind: str
    ai_evaluation: str | None = None
    explanation: str | None = None
    rubric_scores: dict | None = None
    rubric_notes: dict | None = None
    encouragement: str | None = None


@dataclass
class GradeReport:
    score_correct: int
    score_total: int
    percentage: float
    results: list[QuestionGrade] = field(default_factory=list)
    wrong_questions: list[dict] = field(default_factory=list)


def grade_question(q: dict, her_answer: str, db=None, user_id: int | None = None) -> dict:
    answer_kind = q.get("answer_kind")
    if answer_kind == "letter":
        is_correct = her_answer.strip().upper() == str(q.get("expected_answer", "")).upper()
        return {"is_correct": is_correct, "kind": "exact"}
    if answer_kind == "number":
        return _grade_numeric(q, her_answer)
    if answer_kind == "fraction":
        return _grade_fraction(q, her_answer)
    if answer_kind in ("text", "multi"):
        return _grade_with_ai(q, her_answer, db=db, user_id=user_id)
    return {"is_correct": False, "kind": "unknown"}


def _grade_numeric(q: dict, her_answer: str) -> dict:
    expected = str(q.get("expected_answer", "")).strip()
    her = str(her_answer or "").strip()
    rules = q.get("correctness_rules") or {}
    accept_equiv = rules.get("accept_equivalents", False)
    case_sensitive = rules.get("case_sensitive", False)

    if case_sensitive:
        return {"is_correct": her.strip() == expected.strip(), "kind": "exact" if her.strip() == expected.strip() else "incorrect"}

    if not accept_equiv:
        return {"is_correct": _normalize_numeric(her) == _normalize_numeric(expected), "kind": "exact"}

    expected_vals = _numeric_equivalents(expected)
    her_val = _numeric_equivalents(her)
    if expected_vals & her_val:
        return {"is_correct": True, "kind": "equivalent"}
    return {"is_correct": False, "kind": "incorrect"}


def _grade_fraction(q: dict, her_answer: str) -> dict:
    expected = str(q.get("expected_answer", "")).strip()
    her = str(her_answer or "").strip()
    try:
        e_n, e_d = _parse_fraction(expected)
        h_n, h_d = _parse_fraction(her)
    except ValueError:
        return {"is_correct": False, "kind": "incorrect"}
    e_g = math.gcd(e_n, e_d)
    h_g = math.gcd(h_n, h_d)
    if (e_n // e_g, e_d // e_g) == (h_n // h_g, h_d // h_g):
        return {"is_correct": True, "kind": "equivalent"}
    return {"is_correct": False, "kind": "incorrect"}


def _grade_with_ai(q: dict, her_answer: str, db=None, user_id: int | None = None) -> dict:
    system = (
        "You are evaluating a written response from Nandika, a 6 year old advanced learner. "
        "Score her response on the rubric and write a short note about what she did well and "
        "what to consider next time. Never use the words wrong, incorrect, or bad. Never use em dashes. "
        "Output strictly valid JSON with is_correct, correctness_kind, rubric_scores, rubric_notes, "
        "encouragement, and key_observation."
    )
    user = {
        "question": q,
        "expected_answer": q.get("expected_answer"),
        "her_answer": her_answer,
    }
    result, _ = call_ai_json(system, json.dumps(user), db=db, user_id=user_id)
    if not result:
        return {
            "is_correct": bool(her_answer and len(her_answer.strip()) >= 3),
            "kind": "partial",
            "rubric_scores": {},
            "rubric_notes": {},
            "encouragement": "Thanks for explaining your thinking.",
        }
    return {
        "is_correct": bool(result.get("is_correct")),
        "kind": result.get("correctness_kind", "partial"),
        "rubric_scores": result.get("rubric_scores", {}),
        "rubric_notes": result.get("rubric_notes", {}),
        "encouragement": result.get("encouragement"),
        "ai_evaluation": result.get("key_observation"),
    }


def grade_session(questions: list[dict], answers: dict[str, str], db=None, user_id: int | None = None) -> GradeReport:
    results: list[QuestionGrade] = []
    wrong: list[dict] = []
    for q in questions:
        qid = q.get("id")
        her = answers.get(qid, "")
        graded = grade_question(q, her, db=db, user_id=user_id)
        is_correct = graded.get("is_correct", False)
        correctness_kind = graded.get("kind", "incorrect")
        results.append(
            QuestionGrade(
                question_id=qid,
                dimension=q.get("dimension", ""),
                expected_answer=str(q.get("expected_answer", "")),
                her_answer=her or None,
                is_correct=is_correct,
                correctness_kind=correctness_kind,
                ai_evaluation=graded.get("ai_evaluation"),
                explanation=q.get("explanation_for_incorrect") if not is_correct else q.get("explanation_for_correct"),
                rubric_scores=graded.get("rubric_scores"),
                rubric_notes=graded.get("rubric_notes"),
                encouragement=graded.get("encouragement"),
            )
        )
        if not is_correct:
            wrong.append(q)
    correct_count = sum(1 for r in results if r.is_correct)
    total = len(results)
    return GradeReport(
        score_correct=correct_count,
        score_total=total,
        percentage=correct_count / total if total else 0.0,
        results=results,
        wrong_questions=wrong,
    )


def _normalize_numeric(val: str) -> str:
    return val.strip().lower().replace(" ", "")


def _parse_fraction(val: str) -> tuple[int, int]:
    m = re.match(r"^\s*(\d+)\s*/\s*(\d+)\s*$", val)
    if not m:
        raise ValueError("Invalid fraction")
    n, d = int(m.group(1)), int(m.group(2))
    if d == 0:
        raise ValueError("Zero denominator")
    return n, d


def _numeric_equivalents(val: str) -> set[float]:
    cleaned = val.strip().lower().replace(" ", "")
    out = set()
    if not cleaned:
        return out
    if "r" in cleaned:
        parts = cleaned.split("r")
        if len(parts) == 2 and parts[0].isdigit() and parts[1].isdigit():
            q, r = int(parts[0]), int(parts[1])
            out.add(float(q) + float(r) / 1000.0)
        return out
    if cleaned.endswith("%") and cleaned[:-1].isdigit():
        out.add(float(cleaned[:-1]) / 100.0)
        return out
    if "/" in cleaned:
        try:
            n, d = _parse_fraction(cleaned)
            out.add(n / d)
        except ValueError:
            pass
    if re.match(r"^\d+(\.\d+)?$", cleaned):
        out.add(float(cleaned))
    return out
