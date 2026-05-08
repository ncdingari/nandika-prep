# NandikaPrep

A daily gifted test prep portal for Nandika, built to prepare her for the Florida Gifted program CogAT screening. No build step, no server. Open index.html in Chrome or Safari and it runs.

---

## How to Create the GitHub Repo and Enable Pages

### Step 1: Initialize and push

Make sure you have git and the GitHub CLI (gh) installed.

```bash
cd /path/to/nandika-prep
git init
git add .
git commit -m "Initial NandikaPrep build"
gh repo create nandika-prep --public --source=. --remote=origin --push
```

### Step 2: Enable GitHub Pages

```bash
gh api repos/$(gh api user --jq .login)/nandika-prep/pages \
  --method POST \
  --field source.branch=main \
  --field source.path=/
```

Or go to: GitHub repo > Settings > Pages > Source: Deploy from branch > Branch: main > Folder: / (root) > Save.

### Expected URL

```
https://<your-github-username>.github.io/nandika-prep/
```

It may take 1 to 2 minutes for GitHub Pages to build and go live the first time.

---

## How to Add API Keys

1. Open the site in your browser.
2. Tap the gear icon (top right corner of the home screen) four times quickly.
3. The Parent Panel will open.
4. Go to the "API Keys" tab.
5. Paste your DeepSeek API key in the first field.
6. Paste your Anthropic API key in the second field.
7. Tap "Save Keys".

Keys are stored only in your browser's localStorage. They are never sent anywhere except directly to the respective AI provider APIs (api.deepseek.com and api.anthropic.com).

---

## Full Submission Flow

### Mode A: Digital Tap

1. Tap "Start Today's Challenge" on the home screen.
2. Read each question and tap one of the four answer choices (A, B, C, D).
3. After question 18, the Submit screen appears.
4. Go to the "Tap on Screen" tab and tap "Submit and See Results".
5. Results appear immediately.

### Mode B: Upload Photo

1. Print today's worksheet using the "Print Today's Worksheet" button.
2. Complete the printed worksheet on paper.
3. Take one to three clear photos of the completed pages.
4. On the Submit screen, go to the "Upload Photo" tab.
5. Tap the file input and select your photos.
6. Tap "Upload and Grade".
7. The Vision Review screen shows parsed answers with a confidence score for each question.
8. Fix any yellow-flagged answers using the dropdown.
9. Tap "Confirm and Grade" to see results.

### Mode C: Upload Annotated PDF

1. Print today's worksheet.
2. Open the PDF in Apple Notes, Notability, GoodNotes, Adobe Acrobat, or Preview.
3. Circle or mark your answer letter on each question.
4. Export the annotated PDF.
5. On the Submit screen, go to the "Upload PDF" tab.
6. Tap the file input and select the annotated PDF.
7. Tap "Upload and Grade".
8. The portal rasterizes each page to images and sends them to Claude vision.
9. Review the Vision Review screen, fix low-confidence answers, and tap "Confirm and Grade".

---

## AI Routing Logic

DeepSeek is the primary provider for text tasks such as explanations and encouragement.
If DeepSeek fails (network error, timeout over 20 seconds, or API error), the app retries once
and then falls back to Claude for text.

Claude is the only provider for vision tasks: reading photos and annotated PDFs.
DeepSeek does not support vision, so it is never used for photo or PDF grading.

If both providers fail for a text task, the app uses a built-in static explainer that
never needs an internet connection.

A small badge on the results screen shows which provider was used: "Reviewed by DeepSeek",
"Reviewed by Claude", or "Reviewed offline".

---

## Daily Routine Recommendation

20 to 30 minutes per day, 5 days per week.

A suggested schedule:

- Monday through Friday: Complete today's digital challenge (18 questions, roughly 15 minutes).
  Read the results review together. Discuss one question she found tricky.
- Saturday: Print the worksheet for the coming week's first day. Complete on paper.
  Photograph and upload for grading practice.
- Sunday: Rest day. Review the Skills Calendar together and talk about what is coming next week.

Weekend printable challenges: Use the "Print Today's Worksheet" button on any day.
You can print ahead and save worksheets for road trips or when internet is unavailable.

Progression: The app automatically adjusts difficulty. If Nandika scores 90 percent or above
on a subtest, that subtest moves up one level the next day. Below 60 percent moves it down.
Between 60 and 89 percent holds the level. She starts at Level 3 across all 9 subtests.

---

## File Structure

```
nandika-prep/
  index.html               Main HTML file
  styles.css               Custom CSS to supplement Tailwind
  app.js                   SPA controller (ES module)
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
    seed.js                Deterministic PRNG (mulberry32)
    storage.js             localStorage state management
    grader.js              Scoring and level adjustment
    ai.js                  Unified AI router (DeepSeek primary, Claude fallback)
    vision.js              Photo and PDF answer extraction (Claude only)
    pdf.js                 jsPDF worksheet generator
    speech.js              Web Speech API wrapper
    skills-calendar.js     60-day skills calendar
    encouragement.js       Cheer messages and static explanations
  assets/icons/
  .nojekyll                Tells GitHub Pages not to process with Jekyll
  README.md                This file
  SPEC.md                  Full specification
```

---

## Milestones

- Day 7: One Week Champion
- Day 14: Two Weeks Strong, Deetya is cheering (Big Sister badge unlocks)
- Day 30: One Month Master
- Day 50: 50 Days of Brilliance
- Day 60: 60 Day Champion

---

## Git and gh Commands Quick Reference

Push changes after editing:
```bash
git add .
git commit -m "your message here"
git push
```

Check GitHub Pages status:
```bash
gh api repos/$(gh api user --jq .login)/nandika-prep/pages
```

View the site URL:
```bash
gh repo view --web
```
