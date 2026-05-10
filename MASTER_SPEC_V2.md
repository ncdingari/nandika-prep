# MASTER_SPEC_V2.md

**NandikaPrep V2: AI-driven adaptive tutoring portal**

A Python Shiny application deployed to shinyapps.io that serves as a personal AI tutor for Nandika, currently 6 years old, completing 1st grade and rising to 2nd grade. The app prepares her for the **Florida Gifted screening (CogAT Level 8) administered in August**, while running parallel general-advancement tracks at her actual academic level (Kumon Math Level D, Kumon English Level DI).

V2 replaces the deterministic Python question generators of V1 with an AI curriculum engine. DeepSeek and Claude generate worksheets, evaluate responses, and adapt over time. The app is a thin shell that renders what the AI produces.

This document is the complete specification. Save as `MASTER_SPEC_V2.md` in the repo root and instruct Claude Code to read it.

---

## 1. Goals and constraints

### Primary goal (deadline-driven)

Pass the Florida Gifted screening administered to Duval County 2nd graders in August. The screener is **CogAT Form 7 or 8, Level 8** (the version normed for Grade 2 students). A composite score of 130+ (98th percentile, two standard deviations above the mean) qualifies under Florida's Plan A pathway. The screener's 9 subtests at Level 8 use picture-based verbal items (no reading required) and Grade-2-appropriate quantitative content.

**Important calibration note for the AI curriculum engine.** All CogAT prep content must target Level 8 exclusively. CogAT is a reasoning test normed against same-grade peers, so practicing on higher-level questions does not help her score on the Grade 2 norms. Her advanced achievement (Kumon Math Level D, English Level DI) is irrelevant to CogAT difficulty calibration. The two tracks are independent.

### Secondary goal (no deadline)

General advancement across math, reading, writing, and reasoning at her actual academic level. The Kumon tracks (Math Level D long multiplication, long division, fraction reduction; English Level DI paragraph topics, main ideas, restatement) run continuously and advance via mastery gating regardless of where she is on the gifted prep arc.

### Constraints

- App must work on iPad Safari, full-screen via "Add to Home Screen"
- Total daily session: 30 to 50 minutes depending on phase
- Nandika never sees, types, or manages API keys; all credentials live as shinyapps.io environment variables
- All content must be age-appropriate for a 6-year-old: no scary, sad, distressing, religious, or politically charged themes
- No em dashes anywhere in copy
- Mix in 6 to 8 Telugu cheers in transliterated Roman script with English translation in parentheses
- Tone respects her advanced reading level (no babying language) but stays warm

---

## 2. Phase model

The curriculum engine knows which phase the app is in and weights worksheet content accordingly. Phase is computed from `start_date` and `today`, capped at the end-of-program date.

| Phase | Weeks | Daily Composition                                                  | Daily Time |
|-------|-------|---------------------------------------------------------------------|------------|
| 1     | 1-2   | Diagnostic + baseline. Broad coverage across all dimensions.        | 30 min     |
| 2     | 3-8   | Kumon advancement primary, light CogAT format familiarity (2-3 Level 8 questions per session). | 35 min |
| 3     | 9-12  | Heavy CogAT Level 8 prep (50% of session), Kumon continues at reduced volume, weekly full-length CogAT practice on Saturdays. | 45 min |
| 4     | 13-14 | Confidence taper. Light review only, no new material, short sessions. | 25 min   |

The parent panel shows the current phase and can manually override (push earlier into Phase 3 if needed, extend Phase 4, etc.). The phase configuration is stored in the database, not hardcoded, so it can be tuned without redeployment.

---

## 3. Architecture

### Tech stack

Same as V1 except for the curriculum module:

- Python 3.11+
- Shiny for Python 1.0+
- Postgres on Neon (free tier sufficient)
- SQLAlchemy 2.0 with `psycopg[binary]`
- Anthropic Python SDK for Claude (vision, math sanity verification, fallback text)
- OpenAI Python SDK pointed at `https://api.deepseek.com` (primary text)
- Pillow for image preprocessing
- pdf2image with poppler for PDF rasterization
- ReportLab + svglib for printable worksheets
- APScheduler for weekly email summaries
- Environment variables: `ANTHROPIC_API_KEY`, `DEEPSEEK_API_KEY`, `DATABASE_URL`, optional `SMTP_URL` and `PARENT_EMAIL`

### Project structure

```
nandika-prep/
  app.py                          # Shiny entry point, top-level router
  shared.py                       # DB connection, env vars, model names
  requirements.txt
  apt.txt                         # poppler-utils for shinyapps.io
  .env.example
  .gitignore
  data/                           # Local SQLite fallback, gitignored
  modules/
    home.py
    daily_session.py              # Renders the AI-generated daily worksheet
    submission.py                 # Photo and PDF upload
    screening.py                  # AI-driven diagnostic conversation
    parent_panel.py
  lib/
    db.py                         # SQLAlchemy models
    ai.py                         # DeepSeek primary, Claude vision and fallback
    curriculum.py                 # AI curriculum engine: worksheet gen, evaluation, profile updates
    diagnostic.py                 # AI diagnostic engine for Phase 1
    math_verifier.py              # Python sanity-check for AI-generated math questions
    cogat_calibrator.py           # Validates AI-generated CogAT questions match Level 8 spec
    vision.py                     # Photo and PDF answer extraction (Claude only)
    grader.py                     # Hybrid AI + deterministic grading
    pdf_generator.py              # ReportLab worksheet PDF
    pdf_rasterizer.py             # pdf2image
    mastery.py                    # Kumon promotion/demotion
    seed.py                       # Deterministic randomness for stable seeds where needed
    encouragement.py              # Cheer pool
    skills_calendar.py            # Topic seeds for variety
    email_summary.py              # Weekly parent summary
    svg_helpers.py                # SVG utilities for AI-generated visual content
    question_bank.py              # Cache of vetted past questions for stability
  static/
    styles.css
    nandika.js                    # Web Speech API and confetti bridge
    manifest.json                 # PWA manifest for Add to Home Screen
    icons/
      app-icon-192.png
      app-icon-512.png
      owl-1.svg ... owl-5.svg
      girl-avatar.svg
  tests/
    smoke_test.py
    test_curriculum.py
    test_math_verifier.py
    test_cogat_calibrator.py
    test_grader.py
  README.md
  MASTER_SPEC_V2.md
```

### Shared config (`shared.py`)

```python
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./data/nandika.db")
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY")

CLAUDE_MODEL = "claude-sonnet-4-20250514"
DEEPSEEK_MODEL = "deepseek-v4-flash"

NANDIKA_USER_NAME = "Nandika"
TARGET_TEST = "CogAT Level 8 (Grade 2 norms)"
TARGET_DATE_DEFAULT = "2026-08-25"  # Adjustable in parent panel

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

---

## 4. Database schema

```sql
-- users
id                SERIAL PRIMARY KEY
name              TEXT NOT NULL
session_token     TEXT UNIQUE NOT NULL
start_date        DATE NOT NULL
target_date       DATE NOT NULL
created_at        TIMESTAMP DEFAULT NOW()

-- profile (single row per user, updated continuously by AI)
user_id              INTEGER PRIMARY KEY REFERENCES users(id)
ability_estimates    JSONB    -- {dimension: {level: float, confidence: float}}
goal_weights         JSONB    -- {goal: weight}
recent_strengths     JSONB    -- list of recent observed strengths
recent_growth_areas  JSONB    -- list of recent growth areas
parent_notes         TEXT     -- free-text notes from parent panel
last_updated         TIMESTAMP DEFAULT NOW()

-- daily_sessions
id                  SERIAL PRIMARY KEY
user_id             INTEGER REFERENCES users(id)
date                DATE NOT NULL
phase               INTEGER NOT NULL
session_type        TEXT NOT NULL          -- 'daily', 'screening', 'cogat-practice', 'kumon-math', 'kumon-reading'
worksheet_payload   JSONB                  -- the AI-generated worksheet
score_correct       INTEGER
score_total         INTEGER
duration_seconds    INTEGER
ai_provider         TEXT                   -- which provider generated and graded
created_at          TIMESTAMP DEFAULT NOW()

-- session_questions
id                  SERIAL PRIMARY KEY
session_id          INTEGER REFERENCES daily_sessions(id)
question_id         TEXT
dimension           TEXT                   -- 'cogat-verbal-analogies', 'kumon-math-d', etc.
prompt              TEXT
expected_answer     TEXT
her_answer          TEXT
is_correct          BOOLEAN
correctness_kind    TEXT                   -- 'exact', 'equivalent', 'partial', 'incorrect'
ai_evaluation       TEXT                   -- AI's prose evaluation
explanation         TEXT
question_payload    JSONB
quality_score       FLOAT                  -- AI self-rating of question quality at gen time

-- writing_samples
id                  SERIAL PRIMARY KEY
user_id             INTEGER REFERENCES users(id)
session_id          INTEGER REFERENCES daily_sessions(id)
prompt              TEXT
passage_ref         TEXT                   -- source passage if applicable
response            TEXT
rubric_scores       JSONB                  -- {dimension: int}
rubric_notes        JSONB                  -- {dimension: text}
encouragement       TEXT
created_at          TIMESTAMP DEFAULT NOW()

-- screening_conversation
id                  SERIAL PRIMARY KEY
user_id             INTEGER REFERENCES users(id)
turn_number         INTEGER
ai_message          JSONB                  -- structured prompt with optional question
her_response        JSONB
ai_assessment       TEXT
created_at          TIMESTAMP DEFAULT NOW()

-- screening_summary
user_id                  INTEGER PRIMARY KEY REFERENCES users(id)
completed                BOOLEAN DEFAULT FALSE
profile_at_completion    JSONB              -- snapshot of ability_estimates at end of screening
narrative_summary        TEXT
generated_at             TIMESTAMP

-- question_bank (vetted past questions, mixed into future worksheets for stability)
id                  SERIAL PRIMARY KEY
dimension           TEXT
difficulty          INTEGER
prompt              TEXT
expected_answer     TEXT
question_payload    JSONB
times_used          INTEGER DEFAULT 0
quality_score       FLOAT
last_used           TIMESTAMP

-- provider_stats
user_id                INTEGER REFERENCES users(id)
provider               TEXT
success_count          INTEGER DEFAULT 0
fail_count             INTEGER DEFAULT 0
vision_call_count      INTEGER DEFAULT 0
last_updated           TIMESTAMP DEFAULT NOW()
PRIMARY KEY (user_id, provider)

-- badges
user_id          INTEGER REFERENCES users(id)
badge_code       TEXT
unlocked_at      TIMESTAMP DEFAULT NOW()
PRIMARY KEY (user_id, badge_code)

-- parent_nudges (real-time directives from parent panel that the curriculum AI sees)
id                  SERIAL PRIMARY KEY
user_id             INTEGER REFERENCES users(id)
nudge_text          TEXT
active              BOOLEAN DEFAULT TRUE
created_at          TIMESTAMP DEFAULT NOW()
expires_at          TIMESTAMP
```

Indexes on `daily_sessions(user_id, date DESC)`, `session_questions(session_id)`, `writing_samples(user_id, created_at DESC)`, `question_bank(dimension, difficulty)`.

---

## 5. AI router (`lib/ai.py`)

Same as V1: DeepSeek primary for text, Claude for vision (only) and text fallback.

```python
import os, base64
from anthropic import Anthropic
from openai import OpenAI
from shared import ANTHROPIC_API_KEY, DEEPSEEK_API_KEY, CLAUDE_MODEL, DEEPSEEK_MODEL

deepseek_client = OpenAI(api_key=DEEPSEEK_API_KEY, base_url="https://api.deepseek.com")
claude_client = Anthropic(api_key=ANTHROPIC_API_KEY)

class VisionUnavailable(Exception):
    pass

def call_ai(system: str, user: str, json_mode: bool = False,
            image: bytes | None = None, pdf_pages: list[bytes] | None = None,
            max_tokens: int = 4096) -> tuple[str | None, str]:
    """
    Returns (response_text, provider_used).
    Vision tasks: Claude only. Text tasks: DeepSeek primary, Claude fallback, offline final fallback.
    """
    if image or pdf_pages:
        return _call_claude_vision(system, user, image, pdf_pages, max_tokens), "claude"
    try:
        text = _call_deepseek(system, user, json_mode, max_tokens)
        _bump_stats("deepseek", success=True)
        return text, "deepseek"
    except Exception as e:
        _bump_stats("deepseek", success=False)
        _log("deepseek failed", e)
    try:
        text = _call_claude_text(system, user, json_mode, max_tokens)
        _bump_stats("claude", success=True)
        return text, "claude"
    except Exception as e:
        _bump_stats("claude", success=False)
        _log("claude failed", e)
    return None, "offline"
```

Implementation details for `_call_deepseek`, `_call_claude_text`, `_call_claude_vision` follow the V1 spec verbatim.

---

## 6. Curriculum engine (`lib/curriculum.py`)

The heart of V2. Three responsibilities:

1. Generate today's worksheet given the user's profile, goal weights, current phase, and recent history
2. Evaluate her responses with judgment, not just string match
3. Update her profile based on what she got right and wrong

### 6.1 Worksheet generation

#### System prompt (used for all worksheet generation)

```
You are the curriculum engine for NandikaPrep, a personal AI tutor for Nandika, a 6 year old girl finishing 1st grade and rising to 2nd grade. She is academically advanced (Kumon Math Level D, Kumon English Level DI) but is preparing for the Florida Gifted screening (CogAT Level 8) administered to Grade 2 students in August.

You generate today's worksheet as structured JSON. The worksheet contains a mix of question types calibrated to (a) the current phase of her preparation, (b) her current ability profile, (c) the parent's goal weights, and (d) any active parent nudges.

CRITICAL CALIBRATION RULES:

1. CogAT prep questions MUST target Level 8 (Grade 2 norms) exclusively. CogAT Level 8 verbal subtests are picture-based, no reading required. CogAT Level 8 quantitative content is within Grade 2 expectations: number puzzles within 100, simple skip counting, basic number analogies, simple equations with one missing operand. Do not generate higher-grade content for CogAT items even though Nandika can handle it. Higher difficulty does not help her score on Grade 2 norms.

2. Kumon Math content targets Level D (Primary 4 / Grade 4): long multiplication (2-digit by 2-digit, 3-digit by 2-digit), long division (with remainders, 1 and 2 digit divisors), fraction reduction using GCF.

3. Kumon Reading content targets Level DI (approximately Grade 4-5): paragraph topic identification, main idea, restatement, inference, author's purpose. Passages at Lexile 600-900.

4. Reasoning practice that is not tied to a specific test (pattern recognition, analogies, classification, spatial intuition) is fair game at any difficulty appropriate for her ability. Use these for general advancement.

QUESTION TYPES YOU CAN GENERATE:

CogAT Level 8 (all picture-based, no reading required for verbal):
- picture-analogies: top row two related pictures, bottom row pick the matching pair
- sentence-completion-pictures: read aloud a Grade-2 sentence, pick the picture that fits the missing word
- picture-classification: three pictures share a property, pick the fourth
- number-analogies: number pair with rule, find the missing number, all within 100
- number-puzzles: simple equation with one missing value, within 100, single operation
- number-series: short arithmetic sequence, Grade 2 patterns (counting by 1, 2, 5, 10)
- figure-matrices: 2x2 with simple transformation rule (rotation, color, count)
- paper-folding: 1-2 folds then a punch, pick the unfolded result
- figure-classification: three abstract shapes share a property, pick the fourth

Kumon Math Level D:
- long-multiplication: 2-digit by 2-digit or 3-digit by 2-digit
- long-division: 2 to 4 digit dividend by 1 or 2 digit divisor, with or without remainders
- fraction-reduction: reduce a fraction to simplest form using GCF
- mixed-d-review: any of the above

Kumon Reading Level DI:
- vocabulary-in-context: read a sentence with a bracketed word, pick the best replacement
- paragraph-topic: read a 3-4 sentence paragraph, choose its topic
- main-idea: read a paragraph, identify the central claim
- restatement-mc: choose the answer that best restates the paragraph
- restatement-write: write 1-2 sentences restating the passage in her own words
- inference: read a passage, answer questions requiring inference
- summary-write: write 3-4 sentences summarizing a longer passage

General reasoning (calibrated to her ability, can stretch beyond Grade 2):
- analogy-verbal-text: word analogies (advanced, since she reads at Grade 4-5 level)
- pattern-completion: extend a numeric or geometric pattern
- logic-puzzle: simple deductive reasoning (3-4 clues, 3-4 entities)
- classification-text: categorical reasoning with words

WORKSHEET STRUCTURE:

You will be given a target composition (e.g., "Phase 2 daily: 4 Kumon math, 3 Kumon reading, 2 CogAT format familiarity, 2 general reasoning, 1 writing"). Honor it as closely as possible. Order the questions to start gentle, peak in the middle, and end on something achievable so she finishes feeling good.

OUTPUT FORMAT (strict JSON):

{
  "phase": int,
  "session_id": string,
  "introduction": "<warm 1-sentence greeting from the owl mascot, mentioning today's focus>",
  "todays_new_skill": {"name": string, "explanation": string},
  "questions": [
    {
      "id": string,                     // unique within worksheet
      "dimension": string,              // see types above
      "subtype": string,                // optional, for analytics
      "prompt": string,                 // the question text
      "prompt_audio_text": string,      // text optimized for read-aloud (may differ from prompt)
      "visual_svg": string|null,        // SVG markup if the question has a visual
      "choices": [                      // for multiple choice; null for free-response
        {"id": "A", "label": string, "svg": string|null},
        {"id": "B", "label": string, "svg": string|null},
        {"id": "C", "label": string, "svg": string|null},
        {"id": "D", "label": string, "svg": string|null}
      ],
      "expected_answer": string,        // for grading; for write-types this is a model answer
      "answer_kind": "letter"|"number"|"fraction"|"text"|"multi",
      "correctness_rules": {            // hints for the evaluator
        "accept_equivalents": bool,     // e.g., 3/4 == 0.75 == 75%
        "case_sensitive": bool,
        "min_length_chars": int|null    // for write types
      },
      "difficulty_estimate": float,     // 0.0 to 1.0 within the dimension
      "skill_targeted": string,
      "explanation_for_correct": string,// shown after grading even if she got it right
      "explanation_for_incorrect": string,// step by step reasoning
      "quality_self_rating": float      // 0.0 to 1.0; reject your own question if below 0.7
    }
  ],
  "encouragement_for_completion": string
}

Output strictly valid JSON. Output nothing outside the JSON.
```

#### User content for worksheet generation

```python
user_content = json.dumps({
  "today": "2026-05-08",
  "phase": 2,
  "current_streak_days": 5,
  "ability_profile": profile.ability_estimates,
  "goal_weights": profile.goal_weights,
  "parent_nudges_active": [n.nudge_text for n in active_nudges],
  "recent_strengths": profile.recent_strengths,
  "recent_growth_areas": profile.recent_growth_areas,
  "last_7_days_summary": [
    {"date": s.date, "score_pct": s.score_correct/s.score_total,
     "dimensions": [...], "duration_min": s.duration_seconds/60}
    for s in last_7_sessions
  ],
  "todays_target_composition": phase_composition_for(phase),
  "todays_target_total_questions": phase_question_count_for(phase),
  "blessed_questions_to_consider_including": [...],  // 1-2 from question_bank
  "parent_notes": profile.parent_notes
})
```

#### Phase composition table (used to derive the target composition)

```python
PHASE_COMPOSITIONS = {
  1: {  # Diagnostic phase, weeks 1-2
    "total_questions": 12,
    "mix": {
      "cogat-mixed": 3,
      "kumon-math-d": 3,
      "kumon-reading-di": 3,
      "general-reasoning": 2,
      "writing": 1
    }
  },
  2: {  # General advancement, weeks 3-8
    "total_questions": 14,
    "mix": {
      "cogat-mixed": 2,            # light familiarity only
      "kumon-math-d": 5,           # primary advancement track
      "kumon-reading-di": 4,
      "general-reasoning": 2,
      "writing": 1
    }
  },
  3: {  # Heavy CogAT prep, weeks 9-12
    "total_questions": 18,
    "mix": {
      "cogat-mixed": 9,            # 50% of session
      "kumon-math-d": 3,
      "kumon-reading-di": 3,
      "general-reasoning": 2,
      "writing": 1
    },
    "weekly_full_cogat_practice": True   # Saturday: full 9-subtest practice test
  },
  4: {  # Confidence taper, weeks 13-14
    "total_questions": 8,
    "mix": {
      "cogat-mixed": 4,            # only review formats she's already strong at
      "kumon-math-d": 2,           # easy review level only
      "kumon-reading-di": 2,
      "general-reasoning": 0,      # no new material
      "writing": 0
    }
  }
}
```

### 6.2 Quality control on AI-generated questions

After the curriculum AI returns a worksheet, before showing to Nandika, run validation:

#### `lib/math_verifier.py`

For every math question (`long-multiplication`, `long-division`, `fraction-reduction`, `number-puzzles`, `number-analogies`, `number-series`):

1. Parse the prompt to extract operands and operator
2. Compute the answer in Python
3. Compare against the AI's `expected_answer`
4. If they don't match, mark the question as `verification_failed=True`
5. Replace failed questions with a regenerated question or a question pulled from `question_bank` of the same dimension and similar difficulty

Implementation:

```python
def verify_long_multiplication(prompt: str, expected: str) -> bool:
    # parse "23 × 47" or "23 x 47"
    m = re.match(r"(\d+)\s*[×x*]\s*(\d+)", prompt)
    if not m: return False
    a, b = int(m.group(1)), int(m.group(2))
    return int(expected) == a * b

def verify_long_division(prompt: str, expected: str) -> bool:
    # parse "147 ÷ 12" expecting "12 R 3" or "12.25" or "12"
    m = re.match(r"(\d+)\s*[÷/]\s*(\d+)", prompt)
    if not m: return False
    a, b = int(m.group(1)), int(m.group(2))
    quotient, remainder = divmod(a, b)
    if "R" in expected:
        eq, er = expected.split("R")
        return int(eq.strip()) == quotient and int(er.strip()) == remainder
    return int(expected) == quotient and remainder == 0

def verify_fraction_reduction(prompt: str, expected: str) -> bool:
    # parse "Reduce 12/16" expecting "3/4"
    m = re.search(r"(\d+)/(\d+)", prompt)
    if not m: return False
    n, d = int(m.group(1)), int(m.group(2))
    g = math.gcd(n, d)
    return expected.strip() == f"{n//g}/{d//g}"
```

#### `lib/cogat_calibrator.py`

For every CogAT-tagged question, validate Level 8 fit:

1. **Verbal subtests must be picture-based.** If `dimension` is `picture-analogies`, `sentence-completion-pictures`, or `picture-classification`, every choice must have a `svg` field populated. Reject questions where choices are text-only.

2. **Quantitative subtests must stay within Grade 2 number ranges.** All numeric values in prompts and answers must be integers within 0 to 100 (with rare excursion to 1000 only for trivial counting cases). Reject questions with values above this range.

3. **Number-puzzles must be single-operation.** Reject any number-puzzles question containing two or more arithmetic operators.

4. **Figure-matrices must be 2x2 only at Level 8.** 3x3 matrices are introduced at Level 9. Reject 3x3 matrices in CogAT-tagged content.

5. **Paper-folding must use 1 to 2 folds maximum.** 3+ folds are introduced at higher levels.

Failed CogAT questions are replaced with a question from `question_bank` filtered to the same dimension and Level 8 calibration.

#### Quality self-rating gate

Reject any question with `quality_self_rating < 0.7`. If more than 30% of generated questions are rejected, log a warning and back off to a question_bank-only worksheet for that day so Nandika is not delayed.

### 6.3 Evaluation

When Nandika submits, evaluate per question. Use deterministic logic where possible (multiple choice, exact-match numeric, fraction equivalence) and AI judgment for free-response (writing, restatement, summary, written work showing reasoning).

#### Deterministic grader path (`lib/grader.py`)

```python
def grade_question(q: dict, her_answer: str) -> dict:
    if q["answer_kind"] == "letter":
        is_correct = her_answer.strip().upper() == q["expected_answer"].upper()
        return {"is_correct": is_correct, "kind": "exact"}
    if q["answer_kind"] == "number":
        try:
            return _grade_numeric(q, her_answer)
        except Exception:
            pass
    if q["answer_kind"] == "fraction":
        return _grade_fraction(q, her_answer)
    if q["answer_kind"] in ("text", "multi"):
        return _grade_with_ai(q, her_answer)
    return {"is_correct": False, "kind": "unknown"}
```

`_grade_numeric` accepts equivalent forms when `correctness_rules.accept_equivalents` is true: 3/4 = 0.75 = 75%, 23 R 4 = 23.5 (only when remainder context allows), etc.

`_grade_fraction` reduces both her answer and expected to simplest form before comparing.

#### AI evaluation for free-response

System prompt:

```
You are evaluating a written response from Nandika, a 6 year old advanced learner. The original question, expected model answer, and rubric are provided. Score her response on the relevant rubric and write a 2-3 sentence note about what she did well and what to consider next time.

For Kumon English Level DI work (paragraph topic, main idea, restatement, summary, inference), use this rubric:
- Comprehension (0-4): did she correctly identify the topic, main idea, or implied meaning
- Expression (0-4): did she express it in her own words clearly
- Specifics (0-4): did she ground her answer in details from the passage

For general writing prompts, use:
- SpellingAndConventions (0-4)
- ClarityAndStructure (0-4)
- IdeasAndDepth (0-4)

Be specific. Reference exact words she wrote when giving feedback. Be encouraging at her advanced level but honest. Never use the words wrong, incorrect, or bad. Never use em dashes.

Output strictly valid JSON: {
  "is_correct": bool,
  "correctness_kind": "exact"|"equivalent"|"partial"|"incorrect",
  "rubric_scores": {dimension: int},
  "rubric_notes": {dimension: string},
  "encouragement": string,
  "key_observation": string
}. Output nothing outside the JSON.
```

User content includes the question payload, expected answer, her response, and any source passage.

### 6.4 Profile updates after a session

After grading, update the user's profile by calling another AI call:

```
You are updating Nandika's ability profile. Given today's session results and her prior profile, output the updated profile JSON.

For each dimension she practiced today, adjust her estimated level (1.0 to 10.0 scale) based on her performance. Move estimates upward when she succeeds at the current estimate, downward when she struggles, and increase confidence when results are consistent. Identify 1-3 specific strengths shown today (specific skills, not generic) and 1-2 specific growth areas. Write a one-sentence note describing what to emphasize tomorrow.

Output JSON: {
  "ability_estimates": {dimension: {"level": float, "confidence": float}},
  "recent_strengths": [string],
  "recent_growth_areas": [string],
  "tomorrow_emphasis": string
}.
```

---

## 7. Diagnostic engine (`lib/diagnostic.py`)

Phase 1 (weeks 1-2) runs an AI-driven diagnostic instead of fixed test questions. The AI conducts a multi-turn diagnostic conversation across 3 sessions of about 20 minutes each.

Session 1: language and verbal reasoning
Session 2: math and quantitative reasoning
Session 3: visual and spatial reasoning, plus writing baseline

Each session is 8 to 12 questions, AI-adaptive within the session. After each answer, the AI decides whether to probe deeper at the same level, jump up, or jump down. The AI's internal "score book" maps to ability estimates that get written to the profile at session end.

### Diagnostic system prompt

```
You are conducting a diagnostic assessment of Nandika, a 6 year old preparing for the Florida Gifted screening (CogAT Level 8) and pursuing general advancement. You will conduct one of three diagnostic sessions today.

Your goal: by the end of the session, output an estimated ability level (1.0 to 10.0) and confidence (0.0 to 1.0) for each dimension covered, plus 1-2 sentences of qualitative observation.

Conduct the session as a series of 8 to 12 questions. After each answer, decide whether to probe at the same level, increase difficulty, or decrease difficulty based on what you learned. Cover the dimensions assigned. Do not give her feedback on whether her answers are correct; this is a diagnostic, not a tutorial. Keep tone warm, frame everything as puzzles, never as a test.

Output for each turn: { "next_question": {full question payload as in worksheet format}, "internal_assessment_notes": string, "session_progress_pct": float }.

When the session ends (after 8-12 questions or when you have high confidence), output instead: { "session_complete": true, "ability_estimates": {dimension: {"level": float, "confidence": float}}, "qualitative_observations": string }.

CRITICAL: For CogAT-tagged dimensions, generate Level 8 (Grade 2) calibrated questions. For Kumon-tagged dimensions, calibrate to Level D math and Level DI reading. For general reasoning, calibrate to her demonstrated ability.

DIMENSIONS to assess by session:
Session 1: cogat-verbal-analogies, cogat-sentence-completion-pictures, cogat-picture-classification, kumon-reading-di-comprehension, vocabulary-depth
Session 2: cogat-number-analogies, cogat-number-puzzles, cogat-number-series, kumon-math-d-multiplication, kumon-math-d-division, kumon-math-d-fractions
Session 3: cogat-figure-matrices, cogat-paper-folding, cogat-figure-classification, writing-mechanics, writing-depth
```

After all 3 sessions, generate the screening summary narrative the same way V1 did, with this addition: explicitly call out whether her ability profile suggests she is likely, possibly, or unlikely to score 130+ on the upcoming CogAT screener, with reasoning.

---

## 8. Submission flow

Three modes, identical to V1 except all grading routes through the curriculum engine:

- **Digital tap.** Standard.
- **Photo upload.** Pillow preprocesses, Claude vision extracts answers, low-confidence rows flagged for confirmation, then graded.
- **Annotated PDF upload.** pdf2image rasterizes pages at 200 DPI, same Claude vision flow.

Vision system prompts are dimension-aware now since the worksheet contains a mix of question types:

```
You are reading a worksheet completed by Nandika. The worksheet contains a mix of question types. The expected answer kind for each question is provided in the question id list. For multiple choice, identify the letter she marked. For numeric, transcribe what she wrote. For fractions, transcribe in N/D form. For division with remainder, transcribe as "Q R R". For text responses, transcribe verbatim preserving her spelling.

Output strictly valid JSON: {
  "answers": [
    {"questionId": string, "raw_answer": string|null, "answer_kind": string, "confidence": float}
  ]
}.
```

---

## 9. Parent panel

Six tabs:

1. **Overview**: streak, total questions, days to target date, current phase, current ability estimates summary, badges.

2. **Progress charts**: line chart of ability estimates over time per dimension. Highlight CogAT-tagged dimensions in a separate panel with a "Projected CogAT Composite Score" estimate (based on current Level 8 question performance, calibrated against published CogAT norms for Grade 2 students).

3. **Goal weights**: sliders for each goal: "Pass CogAT Level 8 in August" (high), "Advance Kumon Math toward Level E", "Advance Kumon Reading toward Level EI", "Strengthen writing depth", "Build science vocabulary", "Build geography awareness". Values 0 to 10. The curriculum AI sees these weights when generating worksheets.

4. **Phase control**: shows current phase and dates. Manual override to push earlier into Phase 3 or extend Phase 4.

5. **Parent nudges**: free-text input that creates a `parent_nudges` row visible to the curriculum AI on its next worksheet generation. Examples: "She's tired this week, ease up", "Add more verbal classification practice, she missed two yesterday", "Skip writing today, she has handwriting practice elsewhere". Nudges expire after 3 days unless renewed.

6. **Writing samples and AI Provider stats**: scrollable list of last 20 writing samples with rubric breakdowns; provider success/fail counts.

7. **Settings**: Postgres connection (read-only display), backup-to-GitHub schedule, weekly email summary toggle, target test date adjustment, "Re-screen Nandika" button.

---

## 10. Daily session module (`modules/daily_session.py`)

Renders the AI-generated worksheet:

1. Owl mascot says the AI's `introduction`
2. Yellow callout shows `todays_new_skill`
3. Questions render one at a time
4. For each question, render `prompt`, `visual_svg` if present, `choices` as large buttons (or input field for non-multiple-choice), read-aloud icon
5. Auto-advance for multiple choice, manual advance for write-type
6. On submit, run grader, show results screen with per-question `explanation_for_correct` or `explanation_for_incorrect`, rubric scores for write-types, "Reviewed by [provider]" badge
7. Confetti on 80%+

The reactive value holding the worksheet payload is set once per day; refreshing the page does not regenerate. If she finishes early, no new worksheet appears until tomorrow.

For the Saturday full CogAT practice test in Phase 3: a separate session type, 154 questions (per real CogAT Level 8 length), no AI explanation in real time, full report at the end with subtest-by-subtest breakdown and projected composite score.

---

## 11. Static assets and PWA

### `static/manifest.json`

```json
{
  "name": "NandikaPrep",
  "short_name": "NandikaPrep",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#fefce8",
  "theme_color": "#f59e0b",
  "icons": [
    {"src": "/static/icons/app-icon-192.png", "sizes": "192x192", "type": "image/png"},
    {"src": "/static/icons/app-icon-512.png", "sizes": "512x512", "type": "image/png"}
  ]
}
```

### Head tags in `app.py` ui

```html
<link rel="manifest" href="/static/manifest.json">
<link rel="apple-touch-icon" href="/static/icons/app-icon-192.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="NandikaPrep">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="theme-color" content="#f59e0b">
<link rel="stylesheet" href="/static/styles.css">
<script src="/static/nandika.js"></script>
```

### `static/nandika.js`

Web Speech API and confetti bridge from V1, unchanged.

### Icon assets

- `static/icons/app-icon-192.png`: 192x192 PNG of smiling girl with two ponytails on soft yellow background
- `static/icons/app-icon-512.png`: same image at 512x512
- `static/icons/owl-1.svg` through `owl-5.svg`: rotating owl mascot
- `static/icons/girl-avatar.svg`: home dashboard avatar

These assets need to be created. Use simple flat-style illustration. Claude Code can generate them as inline SVG and convert to PNG via Pillow during the build step.

---

## 12. Tone and copy rules

- Never use the words wrong, incorrect, weak, behind, deficient, or struggle
- Never use em dashes; use commas, periods, or parentheses
- Do not baby the language. Nandika reads at Grade 4-5 level. Vocabulary like "deduce", "infer", "categorize", "reasoning" is fine.
- For CogAT-tagged questions, instructions must remain Grade-2 friendly because that's how the real CogAT presents them (kid-friendly, picture-based, read aloud)
- Reading passages at Lexile 600-900 for Kumon DI work
- Mix in 6 to 8 Telugu cheers in transliterated Roman with English translation in parentheses
- Big Sister Cheering Squad badge featuring Deetya unlocks at day 14
- Avoid scary, sad, distressing, religious, or politically charged themes

Telugu cheer pool, at minimum:
- "Shabaash Nandika!" (Well done!)
- "Chala bagundi!" (Very good!)
- "Adirindi Nandika!" (Amazing!)
- "Bagundi!" (Good!)
- "Bhale Nandika!" (Excellent!)
- "Manchi pani chesav!" (You did good work!)

---

## 13. Quality bar

- App cold-starts in under 15 seconds on shinyapps.io Medium tier
- Daily-flow interactions respond in under 2 seconds excluding AI calls
- Worksheet generation completes in under 25 seconds (single AI call with thoughtful streaming display while waiting)
- Vision calls complete in under 30 seconds for 3-page PDF
- Math sanity verifier catches at least 95% of AI hallucinations on test set of 1000 synthetic problems
- CogAT calibrator catches every Level 8 violation on a test set of 500 synthetic CogAT questions
- All copy proofread, no em dashes, age-appropriate language

---

## 14. Deployment

Identical to V1. Account: `sciencephalon`. Use `rsconnect deploy --environment` flag to push env vars from local shell, never commit credentials.

```bash
source ~/.shinyapps_env
rsconnect deploy shiny . \
  --name sciencephalon \
  --title nandika-prep \
  --environment ANTHROPIC_API_KEY \
  --environment DEEPSEEK_API_KEY \
  --environment DATABASE_URL \
  --environment SMTP_URL \
  --environment PARENT_EMAIL
```

Instance settings: Medium, 1 worker, 5 connections per worker, 15 min idle timeout, 60s startup timeout, instance-idle 1 hour or never.

Cost estimate at daily use: $5 to $15 per month in API costs, mostly DeepSeek for worksheet generation, plus Claude for vision and occasional fallback.

---

## 15. Testing

`tests/smoke_test.py`:
- Imports all modules without error
- Mock-call the curriculum engine and assert worksheet JSON shape
- Mock-call the grader on each answer kind
- Mock-call the diagnostic engine for one session

`tests/test_math_verifier.py`:
- 100+ test cases across multiplication, division, fraction reduction
- Including known AI hallucination patterns: off-by-one in long division, mis-reduced fractions, transposed digits in multiplication

`tests/test_cogat_calibrator.py`:
- 50+ test cases of valid Level 8 questions (should pass)
- 50+ test cases of out-of-spec questions (should fail with specific reason)

`tests/test_grader.py`:
- Numeric equivalence: 3/4, 0.75, 75% all match
- Fraction reduction: 6/8 graded against 3/4 should pass when reduction is requested
- Division with remainder: "23 R 4" matches "23 R 4" but not "23 r 4" depending on case rule

`tests/test_curriculum.py`:
- Phase composition table is internally consistent
- Worksheet count and dimension mix match phase config
- Question bank fallback triggers when AI generates too many low-quality questions

Run: `pytest tests/`. All must pass before deploy.

---

## 16. Migration from V1

If V1 has been running for any length of time, the existing `daily_sessions`, `session_questions`, and `writing_samples` tables become seed data for V2's profile. Migration script (`scripts/migrate_v1_to_v2.py`):

1. Create new V2 tables: `profile`, `screening_conversation`, `screening_summary`, `question_bank`, `parent_nudges`
2. Drop unused V1 tables: `progress`, `screening_sessions`, `screening_placements`, `kumon_partial_sessions`
3. For the existing user, build initial `profile.ability_estimates` from her V1 Kumon and CogAT progress data
4. Set `profile.goal_weights` to defaults (CogAT pass = 10, Kumon Math = 7, Kumon Reading = 7, Writing = 5)
5. Mark `screening_summary.completed = false` so she runs through the new V2 diagnostic on next launch
6. Preserve all `daily_sessions`, `session_questions`, `writing_samples`, `provider_stats`, `badges` rows

The CogAT generators in `generators/cogat/` and Kumon generators in `generators/kumon/` from V1 are deleted entirely. Their content is now in the question_bank seed data.

---

## 17. Build order for Claude Code

1. `requirements.txt`, `apt.txt`, `.gitignore`, `.env.example`, `shared.py`
2. `lib/db.py` with V2 schema and `create_all()` on startup
3. `lib/seed.py`, `lib/svg_helpers.py`, `lib/encouragement.py`, `lib/skills_calendar.py`
4. `lib/ai.py` with full routing logic
5. `lib/vision.py`
6. `lib/math_verifier.py` with comprehensive parsing and verification
7. `lib/cogat_calibrator.py` with Level 8 validation rules
8. `lib/curriculum.py` with worksheet generation, evaluation, profile update
9. `lib/diagnostic.py` for Phase 1
10. `lib/grader.py` hybrid AI + deterministic
11. `lib/pdf_generator.py`, `lib/pdf_rasterizer.py`
12. `lib/mastery.py` for Kumon promotion gating
13. `modules/daily_session.py`
14. `modules/submission.py`
15. `modules/screening.py`
16. `modules/home.py`
17. `modules/parent_panel.py` with all 7 tabs
18. `lib/email_summary.py` with APScheduler integration
19. `static/manifest.json`, `static/styles.css`, `static/nandika.js`, icon assets
20. `app.py` top-level router
21. `tests/` folder with all test files
22. `scripts/migrate_v1_to_v2.py` if V1 data exists
23. `README.md` with deployment instructions

After each major section, run `shiny run app.py` and confirm it starts. After all sections, run `pytest tests/`. All tests must pass.

At the end, print deployment commands using `${SHINYAPPS_TOKEN}` and `${SHINYAPPS_SECRET}` as placeholders.

Do not ask clarifying questions. Make reasonable choices and document them in the README.

---

**END OF MASTER_SPEC_V2**
