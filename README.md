# NandikaPrep V2

AI-driven adaptive tutoring portal for Nandika, built with Shiny for Python and deployed to shinyapps.io. V2 uses an AI curriculum engine for daily worksheets, diagnostic sessions, and adaptive profile updates aligned to CogAT Level 8 and Kumon Level D/DI.

## Local development

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Optional environment variables
cp .env.example .env

shiny run app.py
```

Visit `http://localhost:8000` (or the port shown in the console).

## Environment variables

- `DATABASE_URL` (Postgres recommended, SQLite fallback)
- `ANTHROPIC_API_KEY`
- `DEEPSEEK_API_KEY`
- `SMTP_URL` (optional)
- `PARENT_EMAIL` (optional)

## Tests

```bash
pytest tests/
```

## Key behaviors

- **Diagnostic phase (weeks 1-2)** runs AI-driven screening sessions across verbal, math, and spatial dimensions.
- **Daily sessions** adapt to phase, goals, and energy level with mixed CogAT, Kumon, and reasoning questions.
- **Session continuity** resumes in-progress worksheets for 48 hours; stale sessions are auto-finalized.
- **Energy selection** (light, regular, big) adjusts question count and emphasis; choice persists for 12 hours.
- **Bonus sessions** offer optional short practice blocks without affecting streak counts.
- **Parent panel access control** uses a separate passphrase and device roles to protect settings.

## Reasonable choices documented

- Parent settings are stored in `profile.parent_notes` as JSON under a `settings` key to avoid schema churn.
- `tomorrow_emphasis` from the profile update is stored at the front of `profile.recent_growth_areas` so the skill thread continues across days.
- A 6-digit login code is auto-generated on first run, hashed with bcrypt, and can be rotated in the parent panel.
- Energy choice persistence uses localStorage for 12 hours to survive refreshes without extra server state.
- The question bank is lightly seeded for offline fallback; real use should expand it over time.

## Deployment to shinyapps.io

```bash
pip install rsconnect-python

rsconnect add \
  --account sciencephalon \
  --name sciencephalon \
  --token "${SHINYAPPS_TOKEN}" \
  --secret "${SHINYAPPS_SECRET}"

rsconnect deploy shiny . --name sciencephalon --title nandika-prep
```
