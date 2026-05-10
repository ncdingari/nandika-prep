"""
Kumon mastery gating logic.
Advance after 2 consecutive perfect days; drop after 3 consecutive struggle days.
"""
from lib import db as db_lib


def evaluate_session(accuracy: float, time_seconds: int, sct_seconds: int) -> str:
    """Returns 'perfect', 'pass', or 'struggle'."""
    if accuracy >= 1.0 and time_seconds <= sct_seconds:
        return "perfect"
    if accuracy >= 0.8 and time_seconds <= sct_seconds * 1.5:
        return "pass"
    return "struggle"


def update_mastery(db, user_id: int, track: str, outcome: str) -> dict:
    """
    Updates progress table for the given Kumon track.
    Returns {"action": "promote"|"demote"|"hold", "new_level": int}.
    """
    progress = db_lib.get_progress(db, user_id, track)
    if not progress:
        progress = db_lib.upsert_progress(db, user_id, track, current_level=4)

    level = progress.current_level
    perfect_streak = progress.perfect_streak or 0
    struggling_streak = progress.struggling_streak or 0

    if outcome == "perfect":
        perfect_streak += 1
        struggling_streak = 0
        if perfect_streak >= 2 and level < 12:
            level += 1
            perfect_streak = 0
            action = "promote"
        else:
            action = "hold"
    elif outcome == "struggle":
        struggling_streak += 1
        perfect_streak = 0
        if struggling_streak >= 3 and level > 1:
            level -= 1
            struggling_streak = 0
            action = "demote"
        else:
            action = "hold"
    else:  # pass
        perfect_streak = 0
        struggling_streak = 0
        action = "hold"

    db_lib.upsert_progress(
        db, user_id, track,
        current_level=level,
        perfect_streak=perfect_streak,
        struggling_streak=struggling_streak,
    )

    return {"action": action, "new_level": level}


def get_mastery_status(db, user_id: int, track: str) -> dict:
    """Returns display-ready mastery status dict."""
    progress = db_lib.get_progress(db, user_id, track)
    if not progress:
        return {"level": 4, "perfect_streak": 0, "struggling_streak": 0,
                "display_dots": "0 of 2 perfect days"}
    ps = progress.perfect_streak or 0
    dots = "".join("&#9679;" if i < ps else "&#9675;" for i in range(2))
    return {
        "level": progress.current_level,
        "perfect_streak": ps,
        "struggling_streak": progress.struggling_streak or 0,
        "display_dots": f"{dots} {ps} of 2 perfect days at {track.replace('kumon-', '').title()} Level {progress.current_level}",
    }
