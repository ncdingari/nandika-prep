==========================================================
SPEC2: NandikaPrep Kumon Drill Module (Math + Reading/Writing)
==========================================================

Extend the existing NandikaPrep app (built per SPEC.md) with a second daily mode called "Today's Kumon Drill". Do not modify or break the existing CogAT challenge flow. The home screen should now offer two buttons:

- "Today's Gifted Challenge" (existing, CogAT mix)
- "Today's Kumon Drill" (new, this spec)

Both can be done on the same day. Streak counts if she does at least one of the two. A perfect "double day" badge unlocks if she completes both.

PEDAGOGICAL MODEL

Modeled on Kumon Singapore's methodology for a rising 2nd grader. Three principles override the CogAT module's approach:

1. Speed and accuracy together. Every drill is timed. The target is 100 percent correct within the standard completion time (SCT) for that level.
2. Mastery before progression. She advances to the next level only after hitting 100 percent within SCT for two consecutive days. Drop a level if she scores below 80 percent or runs over SCT by more than 50 percent on three consecutive days.
3. Tiny incremental steps. Each level introduces one specific micro-skill, not a mix of skills. A Kumon worksheet looks almost identical to the previous one with a small twist.

DAILY KUMON DRILL STRUCTURE

Each day she gets two worksheets, both timed, total session 15 to 20 minutes:

- Math Drill (8 to 12 minutes target)
- Reading and Writing Drill (8 to 10 minutes target)

She can do them in either order. Both are required to count as a complete Kumon day for the streak.

MATH DRILL (Kumon-style fluency)

Calibration: rising 2nd grader, equivalent to Kumon Levels 2A through A.

Levels 1 to 12 (math):
1. Counting and number recognition 1 to 20 (40 questions, SCT 5 min)
2. Number ordering and missing number (40 questions, SCT 5 min)
3. Addition within 10 (50 questions, SCT 6 min)
4. Addition within 20, no carry (50 questions, SCT 6 min)
5. Addition within 20, with carry (50 questions, SCT 7 min)
6. Subtraction within 10 (50 questions, SCT 6 min)
7. Subtraction within 20, no borrow (50 questions, SCT 6 min)
8. Subtraction within 20, with borrow (50 questions, SCT 7 min)
9. Mixed addition and subtraction within 20 (50 questions, SCT 8 min)
10. Place value, tens and ones, two digit addition no carry (40 questions, SCT 8 min)
11. Two digit addition with carry (40 questions, SCT 9 min)
12. Two digit subtraction with borrow (40 questions, SCT 10 min)

She starts at level 3 unless the parent panel overrides.

Question format: pure computational, vertical or horizontal layout, exactly like a Kumon worksheet. No pictures, no word problems, no multiple choice. She types the numeric answer into a single input box, presses Enter or taps Next, advances. Auto-advance keeps her in flow.

UI for math drill:
- Big timer counting up at the top (not down, less stressful)
- Current question large in the center: "7 + 5 = ?"
- Numeric keypad on screen for tablet use, plus keyboard support
- Progress indicator: "Question 12 of 50"
- No back button mid-drill, just like a real Kumon worksheet
- On submit: full results screen showing time, accuracy, every question with her answer and the correct answer

Generator: lib/kumon-math.js exports generate(level, seed) returning:
{
  level: number,
  sct_seconds: number,
  questions: [
    { id: string, prompt: "7 + 5", correct: 12 },
    ...
  ]
}

Deterministic by date seed, same as CogAT generators.

READING AND WRITING DRILL

Calibration: rising 2nd grader, modeled on Kumon English Levels 3A through 2A and Kumon Singapore Reading Comprehension. Mix of phonics fluency, sight word reading, short comprehension, and writing practice.

Levels 1 to 12 (reading/writing):
1. Letter recognition and phonics, capital and lowercase matching (30 items, SCT 5 min)
2. Beginning sounds, "Which word starts with the same sound as cat?" (25 items, SCT 5 min)
3. Sight words, read aloud and tap (50 sight words, SCT 6 min)
4. Word families (-at, -an, -in, -op), build the word (30 items, SCT 6 min)
5. Short vowel words, read and match to picture (30 items, SCT 7 min)
6. Long vowel words and silent e (30 items, SCT 7 min)
7. Sentence reading, fill in the missing word from 3 choices (20 items, SCT 8 min)
8. Short passage (3 to 4 sentences) plus 3 comprehension questions (5 passages, SCT 9 min)
9. Short passage (5 to 6 sentences) plus 4 comprehension questions (4 passages, SCT 10 min)
10. Vocabulary in context, pick the meaning (25 items, SCT 8 min)
11. Sequencing, put 4 sentences in story order (8 stories, SCT 9 min)
12. Two paragraph passage with 5 mixed comprehension and inference questions (3 passages, SCT 10 min)

She starts at level 3 unless the parent panel overrides.

Each daily reading/writing drill is one worksheet at her current level. The session ends with a writing prompt (see below).

Reading question format: mixed types depending on level. All multiple choice or single-word fill-in to keep grading deterministic. Read-aloud button on every prompt using Web Speech API, since she is 6 and reading independence is still developing. The read-aloud button does NOT pause the timer (Kumon principle: speed matters), but the timer pauses when the dialog is open during the writing prompt only.

Writing component: at the end of every reading drill, one short writing prompt. She types into a textarea (50 to 150 characters depending on level). Examples by level:
- Level 1 to 3: copy a single sentence the portal shows her, focusing on letter formation
- Level 4 to 6: complete a sentence stem ("My favorite food is ___ because ___")
- Level 7 to 9: write 1 to 2 sentences answering a question about the passage she just read
- Level 10 to 12: write 2 to 3 sentences with a topic prompt ("Tell me about something you learned today")

Writing is graded by AI through callAI (DeepSeek primary, Claude fallback). System prompt:

  You are reviewing a 6 year old's short writing sample. Score on three dimensions, each 0 to 3: SpellingAndLetters, GrammarAndCapitalization, IdeasAndCompleteness. Total max 9. For each dimension, write one short kid-friendly note. Be very encouraging. Never use the words wrong, incorrect, or bad. Never use em dashes. Output strictly valid JSON: { "scores": { "spelling": number, "grammar": number, "ideas": number }, "notes": { "spelling": string, "grammar": string, "ideas": string }, "encouragement": string }. Output nothing outside the JSON.

Display the rubric scores as three small star bars on the results screen, then the encouragement line in big friendly type.

Generator: lib/kumon-reading.js exports generate(level, seed) returning:
{
  level: number,
  sct_seconds: number,
  items: [ { id, type, prompt, choices?, correct?, passage?, ... } ],
  writingPrompt: { type: "copy"|"stem"|"answer"|"open", text: string, minChars: number, maxChars: number }
}

Deterministic by date seed.

MASTERY GATING (both drills)

After every drill, evaluate:
- Perfect day = 100 percent accuracy AND time within SCT
- Two consecutive perfect days at level N = advance to level N+1 the next day
- Below 80 percent OR over 1.5x SCT for three consecutive days = drop to level N-1

Track separately for math and reading. Show the streak-toward-promotion as small dots on the dashboard ("1 of 2 perfect days at Math Level 5").

A "Mastery Tree" visual on the dashboard shows her current Kumon level for math and reading as two growing plants. Each level up adds a leaf. Pure CSS or simple SVG.

UI ADDITIONS

Home dashboard updates:
- New section below the CogAT subtest cards: "Kumon Drill" with Math and Reading levels, last completion time, and an "Owl Mascot" SVG that rotates through 5 friendly poses
- Big "Start Today's Kumon Drill" button leads to a sub-screen with two buttons: "Math Drill" and "Reading and Writing Drill"
- Streak indicator now shows two flames if she did both CogAT and Kumon

Parent panel updates:
- Manual level override for kumon-math and kumon-reading (separate from CogAT subtests)
- Last 30 days of math accuracy and time-to-complete as a dual-axis line chart
- Last 30 days of reading accuracy and writing rubric scores as small bar charts
- Toggle to enable or disable Kumon mode entirely
- Toggle for "speed mode" (timer visible) versus "untimed mode" (timer hidden but still recorded), default speed mode on for math, untimed for the writing prompt only

PRINT MODE FOR KUMON

Both drills get a printable PDF version, formatted exactly like a real Kumon worksheet:
- Math: vertical column layout, problem numbers down the left, blank answer line to the right of each problem, name and date and start time and finish time fields at the top
- Reading: passage on top half, questions below, writing prompt with lined paper rules at the bottom
- Black and white only, optimized for clean print

She can complete on paper and submit by photo or annotated PDF the same way as the CogAT challenge. Same Claude vision flow, same low-confidence review step. Math drill photo extraction prompt:

  You are reading a Kumon-style math worksheet completed by a 6 year old named Nandika. The worksheet has numbered arithmetic problems with handwritten answers. For each numbered problem, transcribe the number she wrote as her answer. If a problem is unanswered or unreadable, return null with low confidence. Output strictly valid JSON: { "answers": [ { "questionId": string, "answer": number|null, "confidence": number } ] }. Output nothing else.

Reading drill paper submission supports the same A/B/C/D extraction flow as CogAT for the multiple choice section, plus a separate text extraction call for the handwritten writing prompt:

  You are transcribing handwritten short writing from a 6 year old named Nandika. Output strictly valid JSON: { "transcription": string }. Preserve her spelling exactly as written, even if misspelled. Do not correct anything. Output nothing else.

The transcription then flows into the same writing rubric grader described above.

FILE STRUCTURE ADDITIONS

nandika-prep/
  generators/
    ... (existing)
    kumon-math.js
    kumon-reading.js
  lib/
    ... (existing)
    kumon-mastery.js     # mastery-gating logic, separate from CogAT level adjuster
    timer.js             # reusable count-up timer for drills
  assets/
    icons/
      owl-1.svg ... owl-5.svg

STATE SCHEMA EXTENSIONS

Add to existing state:
{
  ...existing fields,
  kumon: {
    math: {
      level: 3,
      perfectStreak: 0,
      strugglingStreak: 0,
      history: [
        { date, level, accuracy, timeSeconds, sctSeconds, perfectDay: bool }
      ]
    },
    reading: {
      level: 3,
      perfectStreak: 0,
      strugglingStreak: 0,
      history: [
        { date, level, accuracy, timeSeconds, sctSeconds, perfectDay: bool, writingScores: {spelling, grammar, ideas}, writingTranscript: string }
      ]
    },
    enabled: true,
    speedMode: true
  },
  badges: [
    // existing badges, plus:
    // "double-day-7", "double-day-30", "math-level-6", "reading-level-6", "first-perfect-day"
  ]
}

QUESTION GENERATION VOLUME

Math: at minimum 20 question templates per level for levels 1 through 12, so the day-seeded generator can produce a full 50-question worksheet without obvious repetition within a week.

Reading: at minimum 8 templates per level for levels 1 through 12, including at least 5 unique short passages per level for the comprehension levels.

Writing prompts: at minimum 30 prompts per level type (copy, stem, answer, open).

ENCOURAGEMENT TONE

Same rules as the CogAT module: never "wrong" or "incorrect", no em dashes, mix Telugu phrases. Add Kumon-flavored cheers:

- "Faster than yesterday, Nandika! 4 minutes 30 seconds, beautiful."
- "Every problem correct. Shabaash!"
- "You are getting smoother. The hard ones felt easier today."
- "Keep going, your brain is building muscles."

For the writing rubric, the encouragement line must be specific to what she did well, never generic. Example: "I love that you used the word 'because' to explain your idea. That makes your writing strong."

QUALITY BAR

- Math drill must support at least 50 questions in a single session without lag on an iPad
- Reading drill must support audio playback for every prompt, including passage read-aloud at level 7+ (use Web Speech API, slower rate of 0.85 for reading aloud passages)
- Both drills must save partial progress to localStorage every 5 questions, so a crash or accidental close does not lose her work
- All copy proofread, no em dashes, kindergarten-to-2nd-grade reading level on UI text
- Writing prompts and passages must be themselves at a 1st-to-2nd grade reading level (Lexile 200 to 500)
- Reading passages must avoid scary, sad, or distressing themes; keep to friendly, curious, everyday topics

DELIVERABLES

1. Both new generators with full level coverage as specified
2. Two new screens (Math Drill, Reading and Writing Drill) with the count-up timer, autoadvance, and partial save
3. Kumon mastery gating in lib/kumon-mastery.js
4. Updated home dashboard with the Mastery Tree and dual streak flames
5. Updated parent panel with Kumon controls and charts
6. Updated print mode for both drill types
7. Updated README.md section explaining the Kumon Drill module, the mastery rules, and the daily routine recommendation: 20 minutes CogAT plus 15 to 20 minutes Kumon, five days a week

Build this as additive only. Do not modify any existing CogAT code paths. Add new files, extend the state schema additively, and add new UI sections. The existing daily CogAT challenge must continue working exactly as before.

==========================================================