"""
Weekly parent email summary with APScheduler.
Sends every Sunday at 6 PM Eastern if SMTP_URL and PARENT_EMAIL are configured.
"""
import io
import sys
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import date, timedelta, datetime
from urllib.parse import urlparse

from shared import SMTP_URL, PARENT_EMAIL, NANDIKA_USER_NAME
from lib.ai import call_ai


def _log(msg: str) -> None:
    print(f"[email_summary.py] {msg}", file=sys.stderr)


def generate_weekly_summary(db, user_id: int) -> str:
    """Generate and send the weekly summary. Returns 'sent', 'skipped', or 'error'."""
    if not SMTP_URL or not PARENT_EMAIL:
        _log("SMTP_URL or PARENT_EMAIL not configured. Skipping email.")
        return "skipped"

    today = date.today()
    week_start = today - timedelta(days=7)
    week_label = f"{week_start.strftime('%b %d')} to {today.strftime('%b %d, %Y')}"

    # Gather progress data
    from lib.db import DailySession, WritingSample, Profile
    sessions = db.query(DailySession).filter(
        DailySession.user_id == user_id,
        DailySession.date >= week_start,
    ).all()
    profile = db.query(Profile).filter_by(user_id=user_id).first()
    writing_samples = db.query(WritingSample).filter(
        WritingSample.user_id == user_id,
        WritingSample.created_at >= week_start,
    ).order_by(WritingSample.created_at.desc()).all()

    days_completed = len({s.date for s in sessions})
    cogat_sessions = [s for s in sessions if "cogat" in (s.session_type or "")]
    kumon_math_sessions = [s for s in sessions if "kumon-math" in (s.session_type or "")]
    kumon_read_sessions = [s for s in sessions if "kumon-reading" in (s.session_type or "")]

    ability_summary = ""
    if profile and profile.ability_estimates:
        ability_summary = "\n".join(
            f"- {k}: level {v.get('level', '?')}, confidence {v.get('confidence', '?')}"
            for k, v in profile.ability_estimates.items()
        )
    writing_summary = ""
    if writing_samples:
        avg_score = sum(
            (s.spelling_score or 0) + (s.grammar_score or 0) + (s.ideas_score or 0)
            for s in writing_samples
        ) / len(writing_samples)
        best_enc = max(writing_samples, key=lambda x: (x.spelling_score or 0) + (x.grammar_score or 0) + (x.ideas_score or 0))
        writing_summary = f"\nWriting: {len(writing_samples)} samples, avg score {avg_score:.1f}/12. Best response: \"{(best_enc.response or '')[:150]}\""

    structured_data = (
        f"Week: {week_label}\n"
        f"Days completed: {days_completed}/7\n"
        f"CogAT sessions: {len(cogat_sessions)}\n"
        f"Kumon Math sessions: {len(kumon_math_sessions)}\n"
        f"Kumon Reading sessions: {len(kumon_read_sessions)}\n"
        f"Current ability estimates:\n{ability_summary}"
        f"{writing_summary}"
    )

    system = (
        "You are writing a weekly progress summary for Nandika's parent. She is a 6 year old "
        "who works at advanced grade levels. Tone: warm, specific, honest, and respectful of her "
        "advanced ability. Length: 5 to 8 sentences. Highlight one specific area of growth, one "
        "challenge area to watch, and one concrete suggestion for next week. Reference specific "
        "subtests or skills, not generic praise. Never use the words wrong, weak, behind, deficient, "
        "or struggle. Never use em dashes. Output as plain text."
    )

    narrative, _ = call_ai(system=system, user=structured_data)
    narrative = narrative or "This week's summary could not be generated. Please check the app for progress details."

    # Build HTML email
    html_body = (
        f"<html><body style='font-family: sans-serif; max-width: 600px; margin: auto;'>"
        f"<h2 style='color: #6C63FF;'>Nandika's Week in NandikaPrep: {week_label}</h2>"
        f"<p><b>Days completed:</b> {days_completed} of 7</p>"
        f"<p><b>CogAT sessions:</b> {len(cogat_sessions)} | "
        f"<b>Kumon Math:</b> {len(kumon_math_sessions)} | "
        f"<b>Kumon Reading:</b> {len(kumon_read_sessions)}</p>"
        f"<hr>"
        f"<h3>Weekly Summary</h3>"
        f"<p>{narrative}</p>"
        f"<hr>"
        f"<p style='color: #888; font-size: 12px;'>NandikaPrep | Powered by AI</p>"
        f"</body></html>"
    )

    _send_email(
        subject=f"Nandika's week in NandikaPrep: {week_label}",
        html_body=html_body,
    )
    return "sent"


def _send_email(subject: str, html_body: str) -> None:
    if not SMTP_URL or not PARENT_EMAIL:
        return
    try:
        parsed = urlparse(SMTP_URL)
        host = parsed.hostname or ""
        port = parsed.port or 465
        user = parsed.username or ""
        password = parsed.password or ""

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = user
        msg["To"] = PARENT_EMAIL
        msg.attach(MIMEText(html_body, "html"))

        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(host, port, context=context) as server:
            server.login(user, password)
            server.sendmail(user, PARENT_EMAIL, msg.as_string())
        _log(f"Email sent to {PARENT_EMAIL}")
    except Exception as e:
        _log(f"Email send failed: {e}")


def schedule_weekly_email(db_factory) -> None:
    """
    Set up APScheduler to send the email every Sunday at 6 PM Eastern.
    Call this once at app startup.
    """
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        from apscheduler.triggers.cron import CronTrigger

        scheduler = BackgroundScheduler(timezone="America/New_York")

        def _job():
            db = db_factory()
            try:
                from lib.db import User
                users = db.query(User).all()
                for user in users:
                    generate_weekly_summary(db, user.id)
            except Exception as e:
                _log(f"Weekly email job failed: {e}")
            finally:
                db.close()

        def _cleanup():
            from lib.db import SessionProgress, ParentPanelSession, DailySession, SessionQuestion
            db = db_factory()
            try:
                cutoff = datetime.utcnow() - timedelta(hours=48)
                stale = db.query(SessionProgress).filter(
                    SessionProgress.is_finalized == False,
                    SessionProgress.started_at < cutoff,
                ).all()
                for prog in stale:
                    prog.is_finalized = True
                    sess = db.query(DailySession).filter_by(id=prog.session_id).first()
                    if sess and sess.worksheet_payload:
                        questions = sess.worksheet_payload.get("questions", [])
                        for q in questions:
                            db.add(SessionQuestion(
                                session_id=sess.id,
                                question_id=q.get("id"),
                                dimension=q.get("dimension"),
                                expected_answer=q.get("expected_answer"),
                                her_answer=None,
                                is_correct=False,
                                correctness_kind="skipped",
                                ai_evaluation=None,
                                explanation=q.get("explanation_for_incorrect"),
                                question_payload=q,
                            ))
                        sess.score_correct = 0
                        sess.score_total = len(questions)
                    db.commit()
                db.query(ParentPanelSession).filter(
                    ParentPanelSession.expires_at < datetime.utcnow()
                ).delete()
                db.commit()
            except Exception as e:
                _log(f"Cleanup job failed: {e}")
            finally:
                db.close()

        scheduler.add_job(_job, CronTrigger(day_of_week="sun", hour=18, minute=0))
        scheduler.add_job(_cleanup, CronTrigger(minute=0))
        scheduler.start()
        _log("Weekly email scheduler started (Sunday 6 PM Eastern).")
        return scheduler
    except Exception as e:
        _log(f"Failed to start scheduler: {e}")
        return None
