import itertools

from lib.math_verifier import (
    verify_long_multiplication,
    verify_long_division,
    verify_fraction_reduction,
)


def test_multiplication_cases():
    pairs = list(itertools.product(range(11, 26), range(12, 27)))[:100]
    for a, b in pairs:
        prompt = f"{a} x {b}"
        expected = str(a * b)
        assert verify_long_multiplication(prompt, expected)
        assert not verify_long_multiplication(prompt, str(a * b + 1))


def test_division_cases():
    cases = [(144, 12), (156, 12), (221, 17), (100, 4), (98, 7)]
    for a, b in cases:
        q, r = divmod(a, b)
        prompt = f"{a} ÷ {b}"
        if r == 0:
            assert verify_long_division(prompt, str(q))
            assert not verify_long_division(prompt, f"{q} R 1")
        else:
            assert verify_long_division(prompt, f"{q} R {r}")
            assert not verify_long_division(prompt, f"{q} R {r+1}")


def test_fraction_reduction_cases():
    cases = [(12, 16, "3/4"), (24, 36, "2/3"), (21, 28, "3/4"), (18, 30, "3/5")]
    for n, d, expected in cases:
        prompt = f"Reduce {n}/{d}"
        assert verify_fraction_reduction(prompt, expected)
        assert not verify_fraction_reduction(prompt, "1/2")
