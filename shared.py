import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./data/nandika.db")

# psycopg3 requires postgresql+psycopg:// scheme; translate if Neon gives postgresql://
if DATABASE_URL.startswith("postgresql://") and "psycopg" not in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY")
SMTP_URL = os.environ.get("SMTP_URL")
PARENT_EMAIL = os.environ.get("PARENT_EMAIL")

CLAUDE_MODEL = "claude-sonnet-4-20250514"
DEEPSEEK_MODEL = "deepseek-v4-flash"

NANDIKA_USER_NAME = "Nandika"
NANDIKA_SESSION_COOKIE = "nandika_session"
NANDIKA_DEVICE_COOKIE = "nandika_device"
TARGET_TEST = "CogAT Level 8 (Grade 2 norms)"
TARGET_DATE_DEFAULT = "2026-08-25"


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
