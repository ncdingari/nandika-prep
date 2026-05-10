import math
import re


def verify_long_multiplication(prompt: str, expected: str) -> bool:
    m = re.search(r"(\d+)\s*[×x*]\s*(\d+)", prompt)
    if not m:
        return False
    a, b = int(m.group(1)), int(m.group(2))
    try:
        return int(expected.strip()) == a * b
    except ValueError:
        return False


def verify_long_division(prompt: str, expected: str) -> bool:
    m = re.search(r"(\d+)\s*[÷/]\s*(\d+)", prompt)
    if not m:
        return False
    a, b = int(m.group(1)), int(m.group(2))
    q, r = divmod(a, b)
    exp = expected.strip()
    if "R" in exp:
        parts = exp.split("R")
        if len(parts) != 2:
            return False
        try:
            eq = int(parts[0].strip())
            er = int(parts[1].strip())
        except ValueError:
            return False
        return eq == q and er == r
    try:
        return int(exp) == q and r == 0
    except ValueError:
        return False


def verify_fraction_reduction(prompt: str, expected: str) -> bool:
    m = re.search(r"(\d+)\s*/\s*(\d+)", prompt)
    if not m:
        return False
    n, d = int(m.group(1)), int(m.group(2))
    g = math.gcd(n, d)
    return expected.strip() == f"{n//g}/{d//g}"


def verify_number_puzzle(prompt: str, expected: str) -> bool:
    cleaned = prompt.replace("□", "?").replace("__", "?").strip()
    m = re.search(r"(\d+|\?)\s*([+\-×x*/÷])\s*(\d+|\?)\s*=\s*(\d+|\?)", cleaned)
    if not m:
        return False
    a, op, b, c = m.groups()
    expected = expected.strip()

    def to_int(val: str) -> int | None:
        if val == "?":
            return None
        return int(val)

    a_i, b_i, c_i = to_int(a), to_int(b), to_int(c)
    if [a_i, b_i, c_i].count(None) != 1:
        return False

    def apply(x: int, y: int) -> int:
        if op in ("+",):
            return x + y
        if op in ("-",):
            return x - y
        if op in ("×", "x", "*"):
            return x * y
        if op in ("÷", "/"):
            return x // y
        return x + y

    try:
        if a_i is None:
            if op in ("-", "÷", "/"):
                # a op b = c
                if op in ("-",):
                    return int(expected) == c_i + b_i
                return int(expected) == c_i * b_i
            return int(expected) == c_i - b_i
        if b_i is None:
            if op in ("-",):
                return int(expected) == a_i - c_i
            if op in ("÷", "/"):
                return int(expected) == a_i // c_i if c_i else False
            if op in ("×", "x", "*"):
                return int(expected) == c_i // a_i if a_i else False
            return int(expected) == c_i - a_i
        # c is None
        return int(expected) == apply(a_i, b_i)
    except (ValueError, ZeroDivisionError, TypeError):
        return False


def verify_number_analogy(prompt: str, expected: str) -> bool:
    cleaned = prompt.replace("?", "?").strip()
    m = re.search(r"(\d+)\s*[:\-]\s*(\d+)\s*::\s*(\d+)\s*[:\-]\s*(\d+|\?)", cleaned)
    if not m:
        return False
    a, b, c, d = m.groups()
    a, b, c = int(a), int(b), int(c)
    expected_val = int(expected.strip())
    delta = b - a
    ratio = b / a if a else None
    candidates = {c + delta}
    if ratio and ratio.is_integer():
        candidates.add(int(c * ratio))
    return expected_val in candidates


def verify_number_series(prompt: str, expected: str) -> bool:
    nums = [int(x) for x in re.findall(r"\d+", prompt)]
    if len(nums) < 2:
        return False
    expected_val = int(expected.strip())
    diffs = [b - a for a, b in zip(nums, nums[1:])]
    if len(set(diffs)) == 1:
        return expected_val == nums[-1] + diffs[-1]
    if nums[0] != 0:
        ratios = [b / a for a, b in zip(nums, nums[1:]) if a != 0]
        if ratios and len(set(ratios)) == 1 and ratios[0].is_integer():
            return expected_val == int(nums[-1] * ratios[0])
    return False


def verify_math_question(dimension: str, prompt: str, expected: str) -> bool:
    if dimension in ("long-multiplication", "kumon-math-d-multiplication"):
        return verify_long_multiplication(prompt, expected)
    if dimension in ("long-division", "kumon-math-d-division"):
        return verify_long_division(prompt, expected)
    if dimension in ("fraction-reduction", "kumon-math-d-fractions"):
        return verify_fraction_reduction(prompt, expected)
    if dimension in ("number-puzzles", "cogat-number-puzzles"):
        return verify_number_puzzle(prompt, expected)
    if dimension in ("number-analogies", "cogat-number-analogies"):
        return verify_number_analogy(prompt, expected)
    if dimension in ("number-series", "cogat-number-series"):
        return verify_number_series(prompt, expected)
    return True
