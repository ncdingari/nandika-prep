from lib.grader import grade_question, grade_session


def test_numeric_equivalents():
    q = {
        "id": "q1",
        "dimension": "number",
        "expected_answer": "3/4",
        "answer_kind": "number",
        "correctness_rules": {"accept_equivalents": True, "case_sensitive": False},
    }
    assert grade_question(q, "0.75")["is_correct"]
    assert grade_question(q, "75%")["is_correct"]


def test_fraction_reduction():
    q = {
        "id": "q2",
        "dimension": "fraction",
        "expected_answer": "3/4",
        "answer_kind": "fraction",
    }
    assert grade_question(q, "6/8")["is_correct"]


def test_remainder_case_sensitive():
    q = {
        "id": "q3",
        "dimension": "division",
        "expected_answer": "23 R 4",
        "answer_kind": "number",
        "correctness_rules": {"accept_equivalents": True, "case_sensitive": True},
    }
    assert grade_question(q, "23 R 4")["is_correct"]
    assert not grade_question(q, "23 r 4")["is_correct"]


def test_grade_session_summary():
    questions = [
        {"id": "a1", "dimension": "math", "expected_answer": "4", "answer_kind": "number", "correctness_rules": {}},
        {"id": "a2", "dimension": "math", "expected_answer": "A", "answer_kind": "letter"},
    ]
    answers = {"a1": "4", "a2": "B"}
    report = grade_session(questions, answers)
    assert report.score_correct == 1
    assert report.score_total == 2
