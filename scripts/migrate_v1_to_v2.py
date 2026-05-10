import shared
from lib import db as db_lib


def migrate():
    db_lib.create_tables()
    db = shared.SessionLocal()
    try:
        users = db.query(db_lib.User).all()
        for user in users:
            profile = db_lib.get_profile(db, user.id)
            if not profile:
                ability = {}
                progress_rows = db.query(db_lib.Progress).filter_by(user_id=user.id).all()
                for p in progress_rows:
                    ability[p.subtest] = {"level": float(p.current_level), "confidence": 0.4}
                db_lib.upsert_profile(
                    db,
                    user.id,
                    ability_estimates=ability,
                    goal_weights={
                        "cogat_pass": 10,
                        "kumon_math": 7,
                        "kumon_reading": 7,
                        "writing": 5,
                    },
                    recent_strengths=[],
                    recent_growth_areas=[],
                )
            summary = db.query(db_lib.ScreeningSummary).filter_by(user_id=user.id).first()
            if not summary:
                summary = db_lib.ScreeningSummary(user_id=user.id, completed=False)
                db.add(summary)
        db.commit()

        for table in ["progress", "screening_sessions", "screening_placements", "kumon_partial_sessions"]:
            db.execute(f"DROP TABLE IF EXISTS {table}")
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    migrate()
