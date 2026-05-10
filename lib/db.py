from __future__ import annotations

from datetime import datetime, date

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    Text,
)
from sqlalchemy import JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, relationship

import shared


class Base(DeclarativeBase):
    pass


def _jsontype():
    if "sqlite" in shared.DATABASE_URL:
        return JSON
    return JSONB


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    name = Column(Text, nullable=False)
    session_token = Column(Text, unique=True, nullable=False)
    start_date = Column(Date, nullable=False)
    target_date = Column(Date, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    parent_passphrase_hash = Column(Text)
    parent_passphrase_set_at = Column(DateTime)
    login_code_hash = Column(Text)
    passphrase_reset_requested_at = Column(DateTime)
    passphrase_reset_available_at = Column(DateTime)

    profile = relationship("Profile", back_populates="user", uselist=False)


class Profile(Base):
    __tablename__ = "profile"

    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    ability_estimates = Column(_jsontype()())
    goal_weights = Column(_jsontype()())
    recent_strengths = Column(_jsontype()())
    recent_growth_areas = Column(_jsontype()())
    parent_notes = Column(Text)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="profile")


class DailySession(Base):
    __tablename__ = "daily_sessions"
    __table_args__ = (
        Index("ix_daily_sessions_user_date", "user_id", "date"),
        CheckConstraint(
            "energy_level IN ('light', 'regular', 'big', 'bonus')",
            name="ck_daily_sessions_energy_level",
        ),
    )

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    date = Column(Date, nullable=False)
    phase = Column(Integer, nullable=False)
    session_type = Column(Text, nullable=False)
    worksheet_payload = Column(_jsontype()())
    score_correct = Column(Integer)
    score_total = Column(Integer)
    duration_seconds = Column(Integer)
    ai_provider = Column(Text)
    energy_level = Column(Text, default="regular")
    created_at = Column(DateTime, default=datetime.utcnow)

    questions = relationship("SessionQuestion", back_populates="session")


class SessionQuestion(Base):
    __tablename__ = "session_questions"
    __table_args__ = (Index("ix_session_questions_session_id", "session_id"),)

    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey("daily_sessions.id"))
    question_id = Column(Text)
    dimension = Column(Text)
    prompt = Column(Text)
    expected_answer = Column(Text)
    her_answer = Column(Text)
    is_correct = Column(Boolean)
    correctness_kind = Column(Text)
    ai_evaluation = Column(Text)
    explanation = Column(Text)
    question_payload = Column(_jsontype()())
    quality_score = Column(Float)

    session = relationship("DailySession", back_populates="questions")


class SessionProgress(Base):
    __tablename__ = "session_progress"

    session_id = Column(Integer, ForeignKey("daily_sessions.id"), primary_key=True)
    current_index = Column(Integer, default=0)
    answers_so_far = Column(_jsontype()(), default=dict)
    intermediate_work = Column(_jsontype()(), default=dict)
    time_per_question = Column(_jsontype()(), default=dict)
    started_at = Column(DateTime, default=datetime.utcnow)
    last_activity_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_finalized = Column(Boolean, default=False)


class WritingSample(Base):
    __tablename__ = "writing_samples"
    __table_args__ = (Index("ix_writing_samples_user_created", "user_id", "created_at"),)

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    session_id = Column(Integer, ForeignKey("daily_sessions.id"))
    prompt = Column(Text)
    passage_ref = Column(Text)
    response = Column(Text)
    rubric_scores = Column(_jsontype()())
    rubric_notes = Column(_jsontype()())
    encouragement = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


class ScreeningConversation(Base):
    __tablename__ = "screening_conversation"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    turn_number = Column(Integer)
    ai_message = Column(_jsontype()())
    her_response = Column(_jsontype()())
    ai_assessment = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


class ScreeningSummary(Base):
    __tablename__ = "screening_summary"

    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    completed = Column(Boolean, default=False)
    profile_at_completion = Column(_jsontype()())
    narrative_summary = Column(Text)
    generated_at = Column(DateTime)


class QuestionBank(Base):
    __tablename__ = "question_bank"
    __table_args__ = (Index("ix_question_bank_dimension_difficulty", "dimension", "difficulty"),)

    id = Column(Integer, primary_key=True)
    dimension = Column(Text)
    difficulty = Column(Integer)
    prompt = Column(Text)
    expected_answer = Column(Text)
    question_payload = Column(_jsontype()())
    times_used = Column(Integer, default=0)
    quality_score = Column(Float)
    last_used = Column(DateTime)


class ProviderStat(Base):
    __tablename__ = "provider_stats"

    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    provider = Column(Text, primary_key=True)
    success_count = Column(Integer, default=0)
    fail_count = Column(Integer, default=0)
    vision_call_count = Column(Integer, default=0)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Badge(Base):
    __tablename__ = "badges"

    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    badge_code = Column(Text, primary_key=True)
    unlocked_at = Column(DateTime, default=datetime.utcnow)


class ParentNudge(Base):
    __tablename__ = "parent_nudges"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    nudge_text = Column(Text)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime)


class DeviceSession(Base):
    __tablename__ = "device_sessions"
    __table_args__ = (
        CheckConstraint(
            "device_role IN ('student', 'parent')",
            name="ck_device_sessions_device_role",
        ),
    )

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    device_token = Column(Text, unique=True, nullable=False)
    device_name = Column(Text)
    device_role = Column(Text, default="student")
    device_role_set_at = Column(DateTime)
    passphrase_fail_count = Column(Integer, default=0)
    passphrase_fail_window_start = Column(DateTime)
    passphrase_locked_until = Column(DateTime)
    energy_choice = Column(Text)
    energy_choice_set_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_seen_at = Column(DateTime, default=datetime.utcnow)


class ParentPanelSession(Base):
    __tablename__ = "parent_panel_sessions"
    __table_args__ = (
        Index("idx_parent_panel_sessions_lookup", "device_token", "expires_at"),
    )

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    device_token = Column(Text, ForeignKey("device_sessions.device_token", ondelete="CASCADE"))
    authenticated_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)


class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    device_token = Column(Text)
    action = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


# Legacy V1 tables retained for compatibility during transition.
class Progress(Base):
    __tablename__ = "progress"

    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    subtest = Column(Text, nullable=False, primary_key=True)
    current_level = Column(Integer, nullable=False, default=5)
    perfect_streak = Column(Integer, default=0)
    struggling_streak = Column(Integer, default=0)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ScreeningSession(Base):
    __tablename__ = "screening_sessions"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    session_number = Column(Integer, nullable=False)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    session_data = Column(_jsontype()())
    unlocks_next_at = Column(DateTime)


class ScreeningPlacement(Base):
    __tablename__ = "screening_placements"

    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    subtest = Column(Text, primary_key=True)
    placement_level = Column(Integer)
    ceilinged = Column(Boolean, default=False)
    floored = Column(Boolean, default=False)
    attempt_history = Column(_jsontype()())


class KumonPartialSession(Base):
    __tablename__ = "kumon_partial_sessions"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    track = Column(Text, nullable=False)
    level = Column(Integer)
    started_at = Column(DateTime, default=datetime.utcnow)
    last_saved_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    answers_so_far = Column(_jsontype()())
    question_payload = Column(_jsontype()())
    completed = Column(Boolean, default=False)


_COGAT_SUBTESTS = [
    "verbal-analogies",
    "sentence-completion",
    "verbal-classification",
    "number-analogies",
    "number-puzzles",
    "number-series",
    "figure-matrices",
    "paper-folding",
    "figure-classification",
]
_KUMON_TRACKS = ["kumon-math", "kumon-reading", "kumon-writing"]


def create_tables():
    Base.metadata.create_all(shared.engine)


def _default_goal_weights() -> dict:
    return {
        "cogat_pass": 10,
        "kumon_math": 7,
        "kumon_reading": 7,
        "writing": 5,
    }


def _default_profile() -> dict:
    return {
        "ability_estimates": {},
        "goal_weights": _default_goal_weights(),
        "recent_strengths": [],
        "recent_growth_areas": [],
        "parent_notes": "",
    }


def get_or_create_user(
    db,
    name: str,
    session_token: str,
    start_date: date | None = None,
    target_date: date | None = None,
) -> User:
    user = db.query(User).filter_by(session_token=session_token).first()
    if not user:
        user = User(
            name=name,
            session_token=session_token,
            start_date=start_date or date.today(),
            target_date=target_date or date.fromisoformat(shared.TARGET_DATE_DEFAULT),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        _ensure_profile(db, user.id)
        _init_user_progress(db, user)
    else:
        _ensure_profile(db, user.id)
    return user


def _ensure_profile(db, user_id: int) -> Profile:
    profile = db.query(Profile).filter_by(user_id=user_id).first()
    if not profile:
        defaults = _default_profile()
        profile = Profile(
            user_id=user_id,
            ability_estimates=defaults["ability_estimates"],
            goal_weights=defaults["goal_weights"],
            recent_strengths=defaults["recent_strengths"],
            recent_growth_areas=defaults["recent_growth_areas"],
            parent_notes=defaults["parent_notes"],
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


def get_profile(db, user_id: int) -> Profile | None:
    return db.query(Profile).filter_by(user_id=user_id).first()


def upsert_profile(db, user_id: int, **kwargs) -> Profile:
    profile = get_profile(db, user_id)
    if not profile:
        profile = _ensure_profile(db, user_id)
    for k, v in kwargs.items():
        setattr(profile, k, v)
    profile.last_updated = datetime.utcnow()
    db.commit()
    db.refresh(profile)
    return profile


def get_screening_summary(db, user_id: int) -> ScreeningSummary | None:
    return db.query(ScreeningSummary).filter_by(user_id=user_id).first()


def get_recent_sessions(db, user_id: int, session_type: str, limit: int = 30) -> list:
    return (
        db.query(DailySession)
        .filter_by(user_id=user_id, session_type=session_type)
        .order_by(DailySession.date.desc())
        .limit(limit)
        .all()
    )


def _init_user_progress(db, user: User):
    for subtest in _COGAT_SUBTESTS:
        row = Progress(user_id=user.id, subtest=subtest, current_level=5)
        db.add(row)
    kumon_defaults = {"kumon-math": 4, "kumon-reading": 4, "kumon-writing": 4}
    for track, lvl in kumon_defaults.items():
        row = Progress(user_id=user.id, subtest=track, current_level=lvl)
        db.add(row)
    db.commit()


def get_progress(db, user_id: int, subtest: str) -> Progress | None:
    return db.query(Progress).filter_by(user_id=user_id, subtest=subtest).first()


def get_all_progress(db, user_id: int) -> dict:
    rows = db.query(Progress).filter_by(user_id=user_id).all()
    return {r.subtest: r for r in rows}


def upsert_progress(db, user_id: int, subtest: str, **kwargs) -> Progress:
    row = get_progress(db, user_id, subtest)
    if not row:
        row = Progress(user_id=user_id, subtest=subtest, current_level=5)
        db.add(row)
    for k, v in kwargs.items():
        setattr(row, k, v)
    row.last_updated = datetime.utcnow()
    db.commit()
    db.refresh(row)
    return row
