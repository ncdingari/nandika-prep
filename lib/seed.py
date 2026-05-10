import random
from datetime import date


def date_to_seed(d: date | str | None = None) -> int:
    if d is None:
        d = date.today()
    if isinstance(d, str):
        d = date.fromisoformat(d)
    return int(d.strftime("%Y%m%d"))


def make_seeded_random(user_id: int, date_iso: str, subtest: str, question_index: int) -> random.Random:
    seed = hash((user_id, date_iso, subtest, question_index)) & 0xFFFFFFFF
    return random.Random(seed)


def make_daily_rng(user_id: int, date_iso: str, offset: int = 0) -> random.Random:
    seed = hash((user_id, date_iso, "daily", offset)) & 0xFFFFFFFF
    return random.Random(seed)
