from lib.cogat_calibrator import validate_cogat_question


def _valid_question(i: int) -> dict:
    return {
        "dimension": "picture-analogies",
        "prompt": f"Pick the matching picture {i}.",
        "choices": [
            {"id": "A", "svg": "<svg></svg>"},
            {"id": "B", "svg": "<svg></svg>"},
            {"id": "C", "svg": "<svg></svg>"},
            {"id": "D", "svg": "<svg></svg>"},
        ],
        "expected_answer": "A",
    }


def _invalid_questions():
    return [
        {"dimension": "picture-analogies", "prompt": "Missing svg", "choices": [{"id": "A"}], "expected_answer": "A"},
        {"dimension": "number-analogies", "prompt": "120 + 5 = ?", "expected_answer": "125"},
        {"dimension": "number-puzzles", "prompt": "4 + 3 - 2 = ?", "expected_answer": "5"},
        {"dimension": "figure-matrices", "prompt": "3x3 grid", "expected_answer": "A"},
        {"dimension": "paper-folding", "prompt": "3 folds then punch", "question_payload": {"folds": 3}},
    ]


def test_valid_level8_questions():
    for i in range(50):
        ok, _ = validate_cogat_question(_valid_question(i))
        assert ok


def test_invalid_level8_questions():
    invalid = _invalid_questions()
    for i in range(50):
        ok, _ = validate_cogat_question(invalid[i % len(invalid)])
        assert not ok
