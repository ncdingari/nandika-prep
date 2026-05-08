==========================================================
NandikaPrep, an Adaptive Daily Gifted Test Prep Portal
==========================================================

Build a complete, production ready, single page tutoring portal for my 6 year old daughter Nandika who is finishing 1st grade and rising to 2nd grade. The portal prepares her for the Florida Gifted program testing at the start of the next school year. It must be hostable on GitHub Pages (static only, no backend) and modeled after the rigor of Kumon Singapore worksheets and the structure of the CogAT Form 7 and 8 Level 8, the level used for rising 2nd graders. Florida gifted eligibility requires an IQ of two standard deviations above the mean (130+) on an individually administered test, with the CogAT and similar group reasoning tests commonly used as the screener. Train the underlying reasoning skills those screeners measure.

HARD REQUIREMENTS

1. Static only architecture. Pure HTML, CSS, vanilla JavaScript with ES modules. No server, no database, no build step. State persists in localStorage and via downloadable JSON progress files. Site must run when served from https://<username>.github.io/nandika-prep/.
2. Single user (Nandika). No login. Simple "Hi Nandika!" landing screen.
3. Mobile and tablet friendly. She uses an iPad. Touch targets at least 44x44 px, base font 18px, headings 24px+.
4. Kid safe UI. Bright but not overwhelming, friendly rounded font (Nunito or Comic Neue from Google Fonts), generous spacing, clear icons.
5. Daily challenge. A new worksheet each day. Tomorrow locks until today is done. Must teach something new every single day.
6. PDF printing and PDF re-import. She can print today's worksheet, complete on paper, return, and submit answers digitally. Use jsPDF and html2canvas via CDN. She can also annotate the printed PDF in any reader (Apple Notes, Notability, GoodNotes, Adobe Acrobat, Preview) and re-upload the annotated PDF for grading.
7. AI powered review with provider routing. DeepSeek is the primary text provider on cost grounds. Claude is the vision provider for image and PDF answer extraction, and the fallback text provider when DeepSeek fails. The user pastes both keys once into the parent settings panel; both stored in localStorage only with a clear note that they never leave the browser. If both fail for a text task, fall back to a built in static explainer.
8. No em dashes anywhere in copy. Use commas, periods, or parentheses.

API CONFIGURATION

Two providers, configured in the parent panel:

- DeepSeek (primary for text: explanations, encouragement, all non-vision tasks)
  endpoint: https://api.deepseek.com/chat/completions
  model: deepseek-v4-flash
  headers: Authorization: Bearer <key>, content-type: application/json
  format: OpenAI Chat Completions (messages array, response_format json_object when JSON output is needed)

- Anthropic Claude (vision provider for photo and PDF extraction; text fallback only when DeepSeek fails)
  endpoint: https://api.anthropic.com/v1/messages
  model: claude-sonnet-4-20250514
  headers: x-api-key: <key>, anthropic-version: 2023-06-01, anthropic-dangerous-direct-browser-access: true, content-type: application/json
  format: Anthropic Messages (system + messages, image content blocks for vision)

Build a unified lib/ai.js with one function:

  callAI({ task, system, user, json, image, pdf })

Routing logic:
- If image or pdf is provided: call Claude only. On failure, return a clear "Vision unavailable, please retry or enter answers manually" error to the UI. Do NOT silently fall back to DeepSeek for vision; DeepSeek has no native vision and would produce wrong grades.
- If text only: call DeepSeek first. On failure (network error, 4xx, 5xx, rate limit, timeout over 20 seconds), retry once against Claude. If Claude also fails, return null and let the caller fall back to the static explainer.
- Track success and failure counts per provider in state.providerStats so the parent panel can show fallback usage.

Surface a small banner on the results screen showing which provider answered: "Reviewed by DeepSeek", "Reviewed by Claude", or "Reviewed offline" (static fallback).

CURRICULUM (CogAT Form 7 and 8 Level 8, all 9 subtests)

Verbal Battery
1. Picture Analogies
2. Sentence Completion (read aloud via Web Speech API)
3. Picture Classification

Quantitative Battery
4. Number Analogies
5. Number Puzzles
6. Number Series

Nonverbal Battery
7. Figure Matrices
8. Paper Folding
9. Figure Classification

For each subtest, generate questions with deterministic JavaScript generators (no AI for question creation, so the site runs offline and reproducibly). All visuals must be SVG drawn programmatically so they print cleanly to PDF.

DAILY WORKSHEET STRUCTURE

Each day:
- 18 questions: 2 from each of the 9 subtests
- Difficulty adjusts from yesterday's score (90%+ moves up one level, below 60% moves down, in between holds)
- A "Today's New Skill" callout introduces one specific concept she has not seen before. Maintain a 60+ day skills calendar covering verbal, quantitative, and nonverbal themes.
- After submission, show overall score, then per question:
  - Correct: short rotating cheer from a pool of 30+ kid friendly lines, mixing in Telugu phrases like "Shabaash" and "Chala bagundi Nandika!" with English translation in small text underneath. Bulk in English.
  - Wrong: gentle, age appropriate, step by step explanation. Never says "wrong" or "incorrect". Starts with "Let's look at this one together." Routed through callAI (DeepSeek primary, Claude fallback); falls back to a built in static explainer if both fail.

SUBMISSION FLOW (THREE MODES)

Mode A, Digital tap. She taps answer choices on screen, hits Submit, gets graded instantly.

Mode B, Paper photo upload. She prints today's worksheet, completes on paper, takes a photo (single image or up to 3 images for multi-page worksheets), uploads on the Submit screen. The portal sends the image(s) as base64 to Claude with a vision prompt that:
- knows the exact 18 question grid layout (which letter bubble belongs to which question id, since the worksheet was generated deterministically)
- extracts her chosen letter (A/B/C/D) for each of the 18 questions
- returns JSON: { "answers": [ { "questionId": string, "chosenLetter": "A"|"B"|"C"|"D"|null, "confidence": number } ] }
- if any answer has confidence below 0.7, the UI flags those rows and lets her confirm or override before grading is finalized

Mode C, Annotated PDF upload. She opens the printed PDF in any annotator (Apple Notes, Notability, GoodNotes, Adobe Acrobat, Preview), circles or marks her chosen letter on each question, exports the annotated PDF, and uploads it. The portal:
- uses pdf.js (mozilla, via CDN) to rasterize each page client side to PNG at 200 DPI
- sends those page images to Claude vision the same way Mode B does
- returns the same { "answers": [...] } JSON structure
- same low-confidence review step before grading

Vision system prompt for both Mode B and Mode C (Claude only):

  You are reading a worksheet completed by a 6 year old named Nandika. The worksheet contains exactly 18 numbered questions, each with four lettered choices A, B, C, D. For each question, identify which single letter she circled, checked, crossed, colored, or otherwise marked as her answer. If a question is unanswered or unclear, return null for that question and a low confidence value. Output strictly valid JSON with this exact shape and nothing else: { "answers": [ { "questionId": "<id>", "chosenLetter": "A"|"B"|"C"|"D"|null, "confidence": number between 0 and 1 } ] }. Do not include any commentary outside the JSON.

Pass the full ordered list of question ids alongside the image(s) so Claude maps marks to ids correctly.

LEVELS AND PROGRESSION

10 difficulty levels per subtest. Level 1 is approximate kindergarten, Level 5 is on grade 2 level (CogAT Level 8 standard), Level 10 is roughly grade 3 to 4 reasoning. She starts at Level 3 across all subtests. Each completed worksheet adjusts the level per subtest. Show progress bars per subtest on the dashboard. Track a streak counter and total questions answered.

FILE STRUCTURE

nandika-prep/
  index.html
  styles.css
  app.js
  generators/
    picture-analogies.js
    sentence-completion.js
    picture-classification.js
    number-analogies.js
    number-puzzles.js
    number-series.js
    figure-matrices.js
    paper-folding.js
    figure-classification.js
  lib/
    storage.js
    grader.js
    ai.js               # unified router: DeepSeek primary text, Claude vision and text fallback
    vision.js           # photo and PDF answer extraction (Claude only)
    pdf.js              # jsPDF worksheet generator + pdf.js page rasterizer
    speech.js           # Web Speech API wrapper
    skills-calendar.js
    encouragement.js
    seed.js             # deterministic PRNG keyed by date
  assets/icons/
  .nojekyll
  README.md
  SPEC.md               # this file, kept in repo as the source of truth

SPECIFIC FEATURES

1. Home dashboard: Big "Start Today's Challenge" button, streak flame with day count, 9 subtest level cards, "Print Today's Worksheet" button.
2. Question screen: One question at a time. Big SVG. Four answer choices A/B/C/D as large buttons. Read aloud speaker icon on every question. Skip option that marks for review and counts as wrong.
3. Submission screen: Three tabs (Tap on screen, Upload photo, Upload annotated PDF). Each tab explains the flow in one short kid friendly sentence and has a clear confirm step before sending to AI.
4. Vision review screen: Shows the parsed answer grid with green checks for high confidence and yellow flags for low confidence; she can correct any flagged row before final submit.
5. Results screen: Confetti on 80%+ (canvas-confetti CDN). Per question review with explanation. Stars (1, 2, or 3 based on score). Telugu phrase like "Chala bagundi Nandika!" on excellent scores. Small footer badge: "Reviewed by DeepSeek", "Reviewed by Claude", or "Reviewed offline".
6. Parent panel (gear icon, 4 tap soft gate): Last 30 days of scores per subtest as a line chart (Chart.js CDN), manual difficulty override, DeepSeek API key field, Anthropic API key field, provider usage stats (calls succeeded and failed per provider, fallback count, vision call count), full progress JSON export and import, reset.
7. Skills calendar view: All 60+ daily skills, completed checked off, current highlighted, future locked.
8. Print mode: Clean black and white printer friendly PDF with answer bubbles (clearly labeled circles for A B C D), question numbers, page numbers, today's date, "Nandika's Worksheet, Day N" header, encouragement footer. The PDF is laid out so each question's answer bubble row is consistently positioned, making vision extraction reliable.

QUESTION GENERATOR CONTRACT

Each generator exports generate(level, seed) returning:
{
  id, subtest, level, prompt, svg,
  choices: [{id:'A',svg,label}, {id:'B',svg,label}, {id:'C',svg,label}, {id:'D',svg,label}],
  correct: 'A'|'B'|'C'|'D',
  explanation, skill
}

The seed makes generators deterministic so the same date always produces the same worksheet, and the printed PDF matches the digital version exactly. Use a small seedable PRNG in lib/seed.js (mulberry32 is fine).

GENERATOR NOTES

- Picture Analogies: SVG shapes and inline icons with relationships like small to big, one to many, broken to whole, open to closed, young to old.
- Sentence Completion: short read aloud sentences with a missing word, picture choices.
- Picture Classification: three items in a category (round, red, edible), pick the fourth.
- Number Analogies: number pair to number pair, doubling, halving, +1, -1, +2, +5, +10, skip counting.
- Number Puzzles: equations with one missing operand or result. Within 20 at levels 1-3, within 100 at level 5+, two step at level 7+.
- Number Series: arithmetic sequences, counting by 1 at level 1, by 2 at level 3, mixed operations at level 5, growing patterns at level 7.
- Figure Matrices: 2x2 and 3x3 with rotation, color change, size change, count change, or element addition.
- Paper Folding: render fold sequence as small SVGs, then 4 SVG choices for the unfolded result.
- Figure Classification: three shapes sharing a property (curved, symmetric, closed, four sided), pick the fourth.

ENCOURAGEMENT TONE

Right answer cheers (rotate 30+):
- "Yes! You spotted the pattern."
- "Beautiful work, your brain is on fire today."
- "Shabaash Nandika!" (small text below: Well done!)
- "That is exactly right, you are getting faster."
- "Chala bagundi! On to the next one." (small text below: Very good!)

Wrong answer explanation rules:
- Never says wrong or incorrect first
- Starts with "Let's look at this one together"
- Walks through the rule, points out the trick, shows why the right answer fits
- Ends with "Try one more like this tomorrow, you will get it."

The review call (DeepSeek primary, Claude fallback) batches all wrong answers from one session into a single request:

  System: You are a warm, patient tutor for a 6 year old girl named Nandika preparing for the CogAT Level 8 gifted test. For each question she got wrong, write a 2 to 3 sentence explanation a 6 year old can follow. Start with "Let's look at this one together." Walk through the reasoning. Be encouraging. Never use the words wrong or incorrect. Never use em dashes. Output strictly valid JSON: { "explanations": [ { "questionId": string, "text": string } ] }. Output nothing outside the JSON.

  User: array of { questionId, prompt, choices, correct, herAnswer, explanationHint }

For DeepSeek, set response_format to { "type": "json_object" } and include "Output JSON" in the system message to guarantee JSON output. For Claude, request JSON in the system prompt and parse the first JSON block in the response.

STATE SCHEMA

{
  studentName: "Nandika",
  startDate: ISO date,
  currentDay: 1,
  streak: 0,
  totalQuestionsAnswered: 0,
  levelsBySubtest: {
    "picture-analogies": 3,
    "sentence-completion": 3,
    "picture-classification": 3,
    "number-analogies": 3,
    "number-puzzles": 3,
    "number-series": 3,
    "figure-matrices": 3,
    "paper-folding": 3,
    "figure-classification": 3
  },
  history: [],
  apiKeys: { deepseek: null, anthropic: null },
  providerStats: {
    deepseekSuccess: 0,
    deepseekFail: 0,
    anthropicSuccess: 0,
    anthropicFail: 0,
    visionCalls: 0,
    offlineFallback: 0
  },
  skillsCompleted: []
}

TECH STACK

- Vanilla JavaScript with ES modules, zero build step.
- Tailwind via CDN.
- jsPDF and html2canvas via CDN for worksheet generation.
- pdf.js (mozilla) via CDN for client side PDF rasterization on annotated upload.
- Chart.js via CDN for the parent dashboard.
- canvas-confetti via CDN.
- Everything works by opening index.html directly in Chrome or Safari.

DELIVERABLES

1. All files listed in the file structure
2. At least 30 working question templates per subtest across the 10 levels, so 270+ total
3. A 60 day skills calendar in skills-calendar.js covering math, verbal, and reasoning skills appropriate for a rising 2nd grader
4. A README.md with: how to create the GitHub repo, how to enable GitHub Pages on the main branch, the expected URL, how to add both API keys in the parent panel, the full submission flow (digital, photo, annotated PDF), the routing logic (DeepSeek primary text, Claude vision and text fallback), and a daily routine recommendation (20 to 30 minutes per day, 5 days per week, with weekend printable challenges)
5. A .nojekyll file
6. Smoke tests: node generators/picture-analogies.js style scripts that print a sample question to confirm shape

PERSONALIZATION TOUCHES

- Greet by name on home screen, friendly inline SVG avatar of a smiling girl with two ponytails, flat style
- Milestone celebrations on day 7, 14, 30, 50, 60
- 5 to 8 Telugu cheer phrases in transliterated Roman with small English translation underneath
- "Big Sister Cheering Squad" badge featuring her older sister Deetya's name, unlocks at day 14
- Daily skill of the day shown as "New Today, Nandika!" in a yellow callout box

QUALITY BAR

- All code runs without errors when index.html is opened in Chrome or Safari
- All SVG renders correctly in print preview
- Vision extraction works on photos taken with an iPhone in normal indoor light
- pdf.js rasterization at 200 DPI is reliable for standard letter size annotated PDFs up to 4 pages
- Lighthouse 90+ on Performance and Accessibility
- All copy proofread, no em dashes, kindergarten to 2nd grade reading level on user facing text
- Reasoning content at CogAT Level 8 rigor by level 5 of difficulty

Build this end to end, create all files, and at the end print the exact git and gh commands I need to push the repo and enable GitHub Pages. Confirm everything compiles and runs.

Begin now. Do not ask clarifying questions, make reasonable choices and document them in the README.

==========================================================