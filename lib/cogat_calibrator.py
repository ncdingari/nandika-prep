import re


COGAT_VERBAL_PICTURE = {
    "picture-analogies",
    "sentence-completion-pictures",
    "picture-classification",
}

COGAT_QUANT = {
    "number-analogies",
    "number-puzzles",
    "number-series",
}

COGAT_NONVERBAL = {
    "figure-matrices",
    "paper-folding",
    "figure-classification",
}


def _extract_numbers(text: str) -> list[int]:
    return [int(x) for x in re.findall(r"\d+", text or "")]


def _is_trivial_counting(prompt: str) -> bool:
    lowered = (prompt or "").lower()
    return "count" in lowered or "skip" in lowered


def validate_cogat_question(question: dict) -> tuple[bool, list[str]]:
    reasons: list[str] = []
    dimension = question.get("dimension") or question.get("type") or ""
    prompt = question.get("prompt", "")
    expected = str(question.get("expected_answer", "") or question.get("correct", ""))

    if dimension in COGAT_VERBAL_PICTURE:
        choices = question.get("choices", [])
        if not choices or any(not c.get("svg") for c in choices):
            reasons.append("verbal_subtest_requires_svg_choices")

    if dimension in COGAT_QUANT:
        numbers = _extract_numbers(prompt) + _extract_numbers(expected)
        for num in numbers:
            if num > 100:
                if num <= 1000 and _is_trivial_counting(prompt):
                    continue
                reasons.append("number_out_of_range")
                break

    if dimension == "number-puzzles":
        ops = re.findall(r"[+\-×x*/÷]", prompt)
        if len(ops) > 1:
            reasons.append("number_puzzle_multi_operation")

    if dimension == "figure-matrices":
        payload = question.get("question_payload", {}) or {}
        if "3x3" in prompt.lower():
            reasons.append("matrix_not_2x2")
        if payload.get("matrix_size") == "3x3":
            reasons.append("matrix_not_2x2")

    if dimension == "paper-folding":
        payload = question.get("question_payload", {}) or {}
        folds = payload.get("folds")
        if folds is None:
            m = re.search(r"(\d+)\s*fold", prompt.lower())
            folds = int(m.group(1)) if m else None
        if folds is not None and folds > 2:
            reasons.append("too_many_folds")

    return len(reasons) == 0, reasons
