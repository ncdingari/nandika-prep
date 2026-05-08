// app.js - NandikaPrep SPA controller

import { mulberry32, dateToSeed, SeededRandom } from './lib/seed.js';
import { loadState, saveState, updateState, exportJSON, importJSON, resetState } from './lib/storage.js';
import { gradeWorksheet, adjustLevel, updateProgressFromResults } from './lib/grader.js';
import { callAI, getProviderBadge } from './lib/ai.js';
import { extractAnswersFromImages, rasterizePDF, processUploadedAnswers } from './lib/vision.js';
import { generateWorksheetPDF } from './lib/pdf.js';
import { speak, stopSpeech, isSupported as speechSupported } from './lib/speech.js';
import { SKILLS_CALENDAR, getSkillForDay } from './lib/skills-calendar.js';
import { getCheer, WRONG_INTRO, staticExplain, CHEERS } from './lib/encouragement.js';

import { generate as genPictureAnalogies } from './generators/picture-analogies.js';
import { generate as genSentenceCompletion } from './generators/sentence-completion.js';
import { generate as genPictureClassification } from './generators/picture-classification.js';
import { generate as genNumberAnalogies } from './generators/number-analogies.js';
import { generate as genNumberPuzzles } from './generators/number-puzzles.js';
import { generate as genNumberSeries } from './generators/number-series.js';
import { generate as genFigureMatrices } from './generators/figure-matrices.js';
import { generate as genPaperFolding } from './generators/paper-folding.js';
import { generate as genFigureClassification } from './generators/figure-classification.js';

// ─── App State ───────────────────────────────────────────────────────────────

let appState = loadState();
let todayQuestions = null;
let sessionAnswers = new Map(); // questionId -> chosen letter
let gearTapCount = 0;
let gearTapTimer = null;
let activeParentTab = "progress";
let progressChart = null;

// ─── Utilities ────────────────────────────────────────────────────────────────

function today() {
  return new Date().toISOString().slice(0, 10);
}

function todayDateLabel() {
  return new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function getDayNumber() {
  const state = loadState();
  return state.currentDay || 1;
}

function isTodayDone() {
  const state = loadState();
  return state.history.some(h => h.date && h.date.slice(0, 10) === today());
}

function subtestDisplayName(key) {
  const names = {
    "picture-analogies":    "Picture Analogies",
    "sentence-completion":  "Sentence Completion",
    "picture-classification": "Picture Classification",
    "number-analogies":     "Number Analogies",
    "number-puzzles":       "Number Puzzles",
    "number-series":        "Number Series",
    "figure-matrices":      "Figure Matrices",
    "paper-folding":        "Paper Folding",
    "figure-classification":"Figure Classification",
  };
  return names[key] || key;
}

const SUBTESTS = [
  { key: "picture-analogies",     gen: genPictureAnalogies },
  { key: "sentence-completion",   gen: genSentenceCompletion },
  { key: "picture-classification",gen: genPictureClassification },
  { key: "number-analogies",      gen: genNumberAnalogies },
  { key: "number-puzzles",        gen: genNumberPuzzles },
  { key: "number-series",         gen: genNumberSeries },
  { key: "figure-matrices",       gen: genFigureMatrices },
  { key: "paper-folding",         gen: genPaperFolding },
  { key: "figure-classification", gen: genFigureClassification },
];

function generateDailyWorksheet(state) {
  const dateStr = today();
  const seed = dateToSeed(dateStr);
  const rng = new SeededRandom(seed);

  const questions = [];
  for (const { key, gen } of SUBTESTS) {
    const level = state.levelsBySubtest[key] || 3;
    // Generate 2 questions per subtest using the same rng (deterministic per date)
    const q1 = gen(level, rng);
    const q2 = gen(level, rng);
    // Normalize: generators use q.correct, grader.js expects q.correctAnswer
    q1.subtest = key;
    q2.subtest = key;
    if (!q1.correctAnswer && q1.correct) q1.correctAnswer = q1.correct;
    if (!q2.correctAnswer && q2.correct) q2.correctAnswer = q2.correct;
    questions.push(q1, q2);
  }
  return questions;
}

function setHtml(html) {
  document.getElementById("app").innerHTML = html;
}

function el(id) {
  return document.getElementById(id);
}

function checkMilestone(state) {
  const day = state.currentDay || 1;
  const milestones = {
    7: "One Week Champion! Keep going, Nandika!",
    14: "Two Weeks Strong! Deetya is cheering for you!",
    30: "One Month Master! You are amazing!",
    50: "50 Days of Brilliance!",
    60: "60 Day Champion! You did it, Nandika!",
  };
  return milestones[day] || null;
}

// ─── Avatar SVG ──────────────────────────────────────────────────────────────

const AVATAR_SVG = `<svg width="80" height="100" viewBox="0 0 80 100" xmlns="http://www.w3.org/2000/svg" aria-label="Nandika avatar">
  <rect x="20" y="60" width="40" height="35" rx="8" fill="#FF6B9D"/>
  <circle cx="40" cy="42" r="22" fill="#F4A460"/>
  <ellipse cx="40" cy="24" rx="22" ry="12" fill="#3D1C00"/>
  <ellipse cx="15" cy="30" rx="6" ry="10" fill="#3D1C00" transform="rotate(-20 15 30)"/>
  <circle cx="13" cy="22" r="4" fill="#FF6B9D"/>
  <ellipse cx="65" cy="30" rx="6" ry="10" fill="#3D1C00" transform="rotate(20 65 30)"/>
  <circle cx="67" cy="22" r="4" fill="#FF6B9D"/>
  <circle cx="32" cy="42" r="3" fill="#3D1C00"/>
  <circle cx="48" cy="42" r="3" fill="#3D1C00"/>
  <path d="M32 52 Q40 58 48 52" stroke="#3D1C00" stroke-width="2" fill="none" stroke-linecap="round"/>
</svg>`;

// ─── Home Screen ─────────────────────────────────────────────────────────────

function showHome() {
  appState = loadState();
  const state = appState;
  const dayNum = state.currentDay || 1;
  const skill = getSkillForDay(dayNum);
  const streak = state.streak || 0;
  const done = isTodayDone();
  const milestone = checkMilestone(state);
  const bigSister = dayNum >= 14;

  const subtestCards = SUBTESTS.map(({ key }) => {
    const level = state.levelsBySubtest[key] || 3;
    const pct = Math.round((level / 10) * 100);
    return `
    <div class="bg-white rounded-2xl p-3 shadow-sm border border-gray-100">
      <div class="font-bold text-sm text-gray-700 mb-1">${subtestDisplayName(key)}</div>
      <div class="text-xs text-gray-400 mb-1">Level ${level} / 10</div>
      <div class="progress-bar-track">
        <div class="progress-bar-fill" style="width:${pct}%"></div>
      </div>
    </div>`;
  }).join("");

  const milestoneHtml = milestone
    ? `<div class="bg-purple-100 border-2 border-purple-300 rounded-2xl p-4 text-center font-bold text-purple-700 mb-4 text-lg">${milestone}</div>`
    : "";

  const bigSisterHtml = bigSister
    ? `<div class="sister-badge text-center mb-4">Big Sister Cheering Squad: Deetya is cheering for you!</div>`
    : "";

  setHtml(`
  <div class="screen-fade max-w-lg mx-auto px-4 py-6 relative">
    <!-- Gear icon -->
    <button id="gear-btn" aria-label="Parent panel"
      class="absolute top-4 right-4 w-11 h-11 flex items-center justify-center rounded-full bg-white shadow text-2xl no-print">
      &#9881;
    </button>

    <!-- Header -->
    <div class="flex flex-col items-center mb-4">
      ${AVATAR_SVG}
      <h1 class="text-3xl font-extrabold mt-2" style="color:#6C63FF">Hi Nandika!</h1>
      <p class="text-gray-500 text-sm mt-1">${todayDateLabel()} - Day ${dayNum}</p>
    </div>

    ${milestoneHtml}
    ${bigSisterHtml}

    <!-- Streak -->
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-3 mb-4">
      <span class="text-4xl">&#x1F525;</span>
      <div>
        <div class="streak-flame text-2xl font-extrabold">${streak} Day Streak</div>
        <div class="text-gray-400 text-sm">${state.totalQuestionsAnswered || 0} questions answered total</div>
      </div>
    </div>

    <!-- Today's new skill -->
    ${skill ? `<div class="callout-new-skill mb-4">
      <div class="font-extrabold text-yellow-700 text-base">New Today, Nandika! <span class="ml-1">&#127775;</span></div>
      <div class="font-bold mt-1">${skill.skill}</div>
      <div class="text-sm text-gray-600 mt-1">${skill.description || ""}</div>
      <div class="text-xs text-yellow-600 mt-1 uppercase tracking-wide">${skill.theme} skill</div>
    </div>` : ""}

    <!-- Main CTA -->
    ${done
      ? `<div class="bg-green-100 rounded-full py-4 px-6 text-center font-extrabold text-green-700 text-xl mb-3">Today's challenge complete! Come back tomorrow.</div>`
      : `<button id="start-btn"
          class="w-full bg-primary hover:bg-purple-600 active:bg-purple-700 text-white font-extrabold text-xl rounded-full py-5 shadow-lg mb-3 btn-choice transition-all"
          style="min-height:64px;">
          Start Today's Challenge
        </button>`
    }

    <!-- Print Worksheet -->
    <button id="print-btn"
      class="w-full bg-white border-2 border-primary text-primary font-bold text-lg rounded-full py-3 mb-6 btn-choice hover:bg-purple-50 transition-all">
      Print Today's Worksheet
    </button>

    <!-- Subtest level cards -->
    <h2 class="text-lg font-extrabold text-gray-700 mb-3">Your Skills Progress</h2>
    <div class="grid grid-cols-3 gap-2 mb-6">
      ${subtestCards}
    </div>

    <!-- Skills Calendar link -->
    <button id="calendar-btn"
      class="w-full bg-white border-2 border-gray-200 text-gray-600 font-bold text-base rounded-full py-3 btn-choice hover:bg-gray-50 transition-all">
      View 60-Day Skills Calendar
    </button>
  </div>`);

  // Event listeners
  const startBtn = el("start-btn");
  if (startBtn) {
    startBtn.addEventListener("click", () => {
      appState = loadState();
      todayQuestions = generateDailyWorksheet(appState);
      sessionAnswers = new Map();
      showQuestion(0);
    });
  }

  el("print-btn").addEventListener("click", async () => {
    el("print-btn").textContent = "Generating PDF...";
    el("print-btn").disabled = true;
    try {
      appState = loadState();
      const qs = todayQuestions || generateDailyWorksheet(appState);
      const pdfQuestions = qs.map((q, i) => ({
        id: q.id,
        number: i + 1,
        svgPrompt: q.svg,
        text: q.prompt,
        choices: q.choices,
      }));
      const doc = await generateWorksheetPDF(pdfQuestions, getDayNumber(), todayDateLabel());
      doc.save(`nandika-day${getDayNumber()}.pdf`);
    } catch (err) {
      alert("PDF generation failed: " + err.message);
    } finally {
      el("print-btn").textContent = "Print Today's Worksheet";
      el("print-btn").disabled = false;
    }
  });

  el("calendar-btn").addEventListener("click", showSkillsCalendar);

  el("gear-btn").addEventListener("click", handleGearTap);
}

function handleGearTap() {
  gearTapCount++;
  if (gearTapTimer) clearTimeout(gearTapTimer);
  gearTapTimer = setTimeout(() => { gearTapCount = 0; }, 2000);
  if (gearTapCount >= 4) {
    gearTapCount = 0;
    showParentPanel();
  }
}

// ─── Question Screen ──────────────────────────────────────────────────────────

function showQuestion(index) {
  appState = loadState();
  if (!todayQuestions) {
    todayQuestions = generateDailyWorksheet(appState);
  }
  const q = todayQuestions[index];
  const total = todayQuestions.length;
  const dayNum = appState.currentDay || 1;
  const todaySkill = getSkillForDay(dayNum);
  const isNewSkill = todaySkill && q.skill && q.skill.toLowerCase().includes(todaySkill.skill.toLowerCase().split(":")[0].toLowerCase());

  const choiceButtons = q.choices.map(c => `
    <button
      class="btn-choice w-full flex items-center gap-4 bg-white border-2 border-gray-200 rounded-2xl p-3 text-left hover:border-primary hover:bg-purple-50 active:scale-95 transition-all"
      data-choice="${c.id}" aria-label="Choice ${c.id}">
      <span class="text-xl font-extrabold text-primary w-7 flex-shrink-0">${c.id}</span>
      <span class="flex-1 svg-question">${c.svg || c.label}</span>
    </button>`
  ).join("");

  const speechBtn = speechSupported()
    ? `<button id="speak-btn" aria-label="Read question aloud"
        class="ml-2 w-10 h-10 flex items-center justify-center rounded-full bg-purple-100 hover:bg-purple-200 text-xl btn-choice">
        &#x1F50A;
      </button>`
    : "";

  setHtml(`
  <div class="screen-fade max-w-lg mx-auto px-4 py-4">
    <!-- Header row -->
    <div class="flex items-center justify-between mb-3">
      <button id="back-home-btn" class="text-gray-400 hover:text-gray-600 text-sm font-bold btn-choice px-3 py-2 rounded-xl bg-white border border-gray-200">
        Home
      </button>
      <div class="text-center">
        <span class="font-extrabold text-gray-700">Question ${index + 1} of ${total}</span>
        <div class="text-xs text-gray-400">${subtestDisplayName(q.subtest)}</div>
      </div>
      <div class="text-right">
        <div class="text-xs font-bold px-3 py-1 rounded-full text-white" style="background:#6C63FF">${subtestDisplayName(q.subtest)}</div>
      </div>
    </div>

    <!-- Progress bar -->
    <div class="progress-bar-track mb-4">
      <div class="progress-bar-fill" style="width:${Math.round(((index) / total) * 100)}%"></div>
    </div>

    <!-- New Today badge -->
    ${isNewSkill ? `<div class="callout-new-skill mb-3 text-sm">New Today! <strong>${todaySkill.skill}</strong></div>` : ""}

    <!-- Question prompt -->
    <div class="flex items-start gap-2 mb-4">
      <div class="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <p class="font-bold text-gray-800 mb-3 text-lg leading-snug">${q.prompt}</p>
        <div class="svg-question">${q.svg || ""}</div>
      </div>
      ${speechBtn}
    </div>

    <!-- Choices -->
    <div id="choices-list" class="flex flex-col gap-3 mb-5">
      ${choiceButtons}
    </div>

    <!-- Skip button -->
    <div class="flex justify-center">
      <button id="skip-btn" class="text-gray-400 hover:text-gray-600 text-sm underline btn-choice px-4 py-2">
        Skip this question
      </button>
    </div>
  </div>`);

  // Speak button
  const speakBtn = el("speak-btn");
  if (speakBtn) {
    speakBtn.addEventListener("click", () => {
      speak(q.prompt).catch(() => {});
    });
  }

  // Choice buttons
  el("choices-list").querySelectorAll("[data-choice]").forEach(btn => {
    btn.addEventListener("click", () => {
      const chosen = btn.dataset.choice;
      sessionAnswers.set(q.id, chosen);
      // Highlight selected
      el("choices-list").querySelectorAll("[data-choice]").forEach(b => {
        b.classList.remove("border-primary", "bg-purple-50");
        b.classList.add("border-gray-200");
      });
      btn.classList.add("border-primary", "bg-purple-50");
      btn.classList.remove("border-gray-200");
      // Short delay then advance
      setTimeout(() => {
        if (index + 1 < total) {
          showQuestion(index + 1);
        } else {
          showSubmit();
        }
      }, 350);
    });
  });

  el("skip-btn").addEventListener("click", () => {
    // skip = null answer (will count as wrong)
    if (index + 1 < total) {
      showQuestion(index + 1);
    } else {
      showSubmit();
    }
  });

  el("back-home-btn").addEventListener("click", () => {
    if (confirm("Go back to home? Your progress on this session will be lost.")) {
      showHome();
    }
  });
}

// ─── Submit Screen ────────────────────────────────────────────────────────────

function showSubmit() {
  let activeTab = "digital";

  function renderSubmitScreen() {
    const tabs = ["digital", "photo", "pdf"];
    const tabLabels = { digital: "Tap on Screen", photo: "Upload Photo", pdf: "Upload PDF" };
    const tabHtml = tabs.map(t => `
      <button class="tab-btn ${activeTab === t ? "active" : "inactive"}" data-tab="${t}">
        ${tabLabels[t]}
      </button>`).join("");

    let panelHtml = "";
    if (activeTab === "digital") {
      const answered = sessionAnswers.size;
      const total = todayQuestions ? todayQuestions.length : 18;
      panelHtml = `
        <div class="text-center py-6">
          <div class="text-6xl mb-4">&#x1F4F1;</div>
          <p class="text-gray-700 font-bold text-xl mb-2">You answered ${answered} of ${total} questions on screen.</p>
          <p class="text-gray-500 mb-6">Ready to see how you did? Tap Submit!</p>
          <button id="digital-submit-btn"
            class="w-full bg-primary text-white font-extrabold text-xl rounded-full py-5 shadow-lg btn-choice"
            style="min-height:64px;">
            Submit and See Results
          </button>
        </div>`;
    } else if (activeTab === "photo") {
      panelHtml = `
        <div class="py-4">
          <div class="text-4xl text-center mb-3">&#x1F4F8;</div>
          <p class="text-gray-700 font-bold mb-2">Take a photo of your completed worksheet and upload it here.</p>
          <p class="text-gray-500 text-sm mb-4">You can upload up to 3 photos (one per page).</p>
          <input type="file" id="photo-input" accept="image/*" multiple class="w-full border-2 border-dashed border-gray-300 rounded-xl p-4 mb-4" />
          <div id="photo-previews" class="flex flex-wrap gap-2 mb-4"></div>
          <button id="photo-submit-btn"
            class="w-full bg-primary text-white font-extrabold text-xl rounded-full py-4 shadow-lg btn-choice">
            Upload and Grade
          </button>
        </div>`;
    } else {
      panelHtml = `
        <div class="py-4">
          <div class="text-4xl text-center mb-3">&#x1F4C4;</div>
          <p class="text-gray-700 font-bold mb-2">Export your annotated PDF and upload it here.</p>
          <p class="text-gray-500 text-sm mb-4">Works with Apple Notes, Notability, GoodNotes, Acrobat, or Preview.</p>
          <input type="file" id="pdf-input" accept="application/pdf" class="w-full border-2 border-dashed border-gray-300 rounded-xl p-4 mb-4" />
          <button id="pdf-submit-btn"
            class="w-full bg-primary text-white font-extrabold text-xl rounded-full py-4 shadow-lg btn-choice">
            Upload and Grade
          </button>
        </div>`;
    }

    setHtml(`
    <div class="screen-fade max-w-lg mx-auto px-4 py-4">
      <div class="flex items-center gap-3 mb-4">
        <button id="submit-back-btn" class="text-gray-400 hover:text-gray-600 text-sm font-bold btn-choice px-3 py-2 rounded-xl bg-white border border-gray-200">
          Back
        </button>
        <h2 class="text-2xl font-extrabold text-gray-800 flex-1">Submit Answers</h2>
      </div>

      <!-- Tabs -->
      <div class="flex gap-2 mb-5 flex-wrap">
        ${tabHtml}
      </div>

      <!-- Panel -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        ${panelHtml}
      </div>
    </div>`);

    // Tab switching
    document.querySelectorAll(".tab-btn[data-tab]").forEach(btn => {
      btn.addEventListener("click", () => {
        activeTab = btn.dataset.tab;
        renderSubmitScreen();
      });
    });

    el("submit-back-btn").addEventListener("click", () => {
      if (todayQuestions && todayQuestions.length > 0) {
        showQuestion(todayQuestions.length - 1);
      } else {
        showHome();
      }
    });

    // Digital submit
    const digitalBtn = el("digital-submit-btn");
    if (digitalBtn) {
      digitalBtn.addEventListener("click", () => submitDigital());
    }

    // Photo submit
    const photoInput = el("photo-input");
    if (photoInput) {
      photoInput.addEventListener("change", () => {
        const previews = el("photo-previews");
        if (!previews) return;
        previews.innerHTML = "";
        Array.from(photoInput.files).forEach(f => {
          const url = URL.createObjectURL(f);
          previews.innerHTML += `<img src="${url}" class="w-20 h-20 object-cover rounded-xl border-2 border-gray-200" />`;
        });
      });
      const photoBtn = el("photo-submit-btn");
      if (photoBtn) {
        photoBtn.addEventListener("click", () => submitPhoto());
      }
    }

    // PDF submit
    const pdfBtn = el("pdf-submit-btn");
    if (pdfBtn) {
      pdfBtn.addEventListener("click", () => submitPDF());
    }
  }

  renderSubmitScreen();
}

async function submitDigital() {
  const btn = el("digital-submit-btn");
  if (btn) { btn.textContent = "Grading..."; btn.disabled = true; }
  try {
    await gradeAndShowResults(sessionAnswers);
  } catch(e) {
    if (btn) { btn.textContent = "Submit and See Results"; btn.disabled = false; }
    alert("Error grading: " + e.message);
  }
}

async function submitPhoto() {
  const photoInput = el("photo-input");
  const btn = el("photo-submit-btn");
  if (!photoInput || !photoInput.files.length) {
    alert("Please select at least one photo first.");
    return;
  }
  if (btn) { btn.textContent = "Sending to AI..."; btn.disabled = true; }

  try {
    const dataUrls = await Promise.all(
      Array.from(photoInput.files).map(f => fileToDataURL(f))
    );
    const questionIds = (todayQuestions || []).map(q => q.id);
    const result = await processUploadedAnswers(dataUrls, questionIds);
    if (result && result.answers) {
      showVisionReview(result.answers);
    } else {
      if (btn) { btn.textContent = "Upload and Grade"; btn.disabled = false; }
      alert("Could not read answers from photo. Please check your Anthropic API key or try again.");
    }
  } catch(e) {
    if (btn) { btn.textContent = "Upload and Grade"; btn.disabled = false; }
    alert("Photo processing failed: " + e.message);
  }
}

async function submitPDF() {
  const pdfInput = el("pdf-input");
  const btn = el("pdf-submit-btn");
  if (!pdfInput || !pdfInput.files.length) {
    alert("Please select a PDF file first.");
    return;
  }
  if (btn) { btn.textContent = "Processing PDF..."; btn.disabled = true; }

  try {
    const pageImages = await rasterizePDF(pdfInput.files[0]);
    const questionIds = (todayQuestions || []).map(q => q.id);
    const result = await processUploadedAnswers(pageImages, questionIds);
    if (result && result.answers) {
      showVisionReview(result.answers);
    } else {
      if (btn) { btn.textContent = "Upload and Grade"; btn.disabled = false; }
      alert("Could not read answers from PDF. Please check your Anthropic API key or try again.");
    }
  } catch(e) {
    if (btn) { btn.textContent = "Upload and Grade"; btn.disabled = false; }
    alert("PDF processing failed: " + e.message);
  }
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Vision Review Screen ─────────────────────────────────────────────────────

function showVisionReview(parsedAnswers) {
  const qs = todayQuestions || [];
  const rows = qs.map((q, i) => {
    const parsed = parsedAnswers.find(a => a.questionId === q.id);
    const letter = parsed ? (parsed.chosenLetter || "?") : "?";
    const confidence = parsed ? (parsed.confidence || 0) : 0;
    const pct = Math.round(confidence * 100);
    const flagged = confidence < 0.7;
    const icon = confidence >= 0.7 ? "&#x2705;" : "&#x26A0;&#xFE0F;";
    const barColor = confidence >= 0.7 ? "#2ECC71" : "#F39C12";

    const dropdown = flagged
      ? `<select class="vision-override border rounded px-2 py-1 text-sm" data-qid="${q.id}">
          <option value="">Keep ${letter}</option>
          <option value="A">A</option>
          <option value="B">B</option>
          <option value="C">C</option>
          <option value="D">D</option>
        </select>`
      : "";

    return `
    <div class="flex items-center gap-3 py-2 border-b border-gray-100">
      <span class="font-bold text-gray-500 w-6 text-sm">${i + 1}</span>
      <span class="font-extrabold text-lg w-8 text-center">${letter}</span>
      <div class="flex-1">
        <div class="progress-bar-track">
          <div style="height:100%;width:${pct}%;background:${barColor};border-radius:999px;"></div>
        </div>
        <div class="text-xs text-gray-400 mt-0.5">${pct}% confident</div>
      </div>
      <span class="text-lg">${icon}</span>
      ${dropdown}
    </div>`;
  }).join("");

  setHtml(`
  <div class="screen-fade max-w-lg mx-auto px-4 py-4">
    <h2 class="text-2xl font-extrabold text-gray-800 mb-1">Review Your Answers</h2>
    <p class="text-gray-500 text-sm mb-4">Check any yellow flags and fix them before we grade.</p>

    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-5">
      ${rows}
    </div>

    <button id="confirm-grade-btn"
      class="w-full bg-primary text-white font-extrabold text-xl rounded-full py-5 shadow-lg btn-choice"
      style="min-height:64px;">
      Confirm and Grade
    </button>
  </div>`);

  el("confirm-grade-btn").addEventListener("click", () => {
    const answers = new Map();
    const qs2 = todayQuestions || [];
    qs2.forEach((q, i) => {
      const parsed = parsedAnswers.find(a => a.questionId === q.id);
      const override = document.querySelector(`.vision-override[data-qid="${q.id}"]`);
      if (override && override.value) {
        answers.set(q.id, override.value);
      } else if (parsed && parsed.chosenLetter) {
        answers.set(q.id, parsed.chosenLetter);
      }
    });
    gradeAndShowResults(answers);
  });
}

// ─── Grading Logic ────────────────────────────────────────────────────────────

async function gradeAndShowResults(answers) {
  const qs = todayQuestions || [];
  const gradeData = gradeWorksheet(qs, answers);

  // Build subtestResults
  const subtestBuckets = {};
  for (const { key } of SUBTESTS) subtestBuckets[key] = { score: 0, total: 0, percentage: 0 };

  gradeData.results.forEach(r => {
    const q = qs.find(q => q.id === r.questionId);
    if (!q) return;
    const bucket = subtestBuckets[q.subtest];
    if (!bucket) return;
    bucket.total++;
    if (r.isCorrect) bucket.score++;
  });
  for (const key of Object.keys(subtestBuckets)) {
    const b = subtestBuckets[key];
    b.percentage = b.total > 0 ? Math.round((b.score / b.total) * 100) : 0;
  }

  // Update state
  appState = loadState();
  const dayResults = {
    date: today(),
    day: appState.currentDay || 1,
    subtestResults: subtestBuckets,
  };
  updateProgressFromResults(appState, dayResults);
  saveState(appState);

  // Get AI explanations for wrong answers
  const wrongQs = gradeData.wrongQuestions;
  let explanations = {};

  if (wrongQs.length > 0) {
    const wrongPayload = wrongQs.map(q => {
      const result = gradeData.results.find(r => r.questionId === q.id);
      return {
        questionId: q.id,
        prompt: q.prompt,
        choices: (q.choices || []).map(c => ({ id: c.id, label: c.label })),
        correct: q.correct || q.correctAnswer,
        herAnswer: result ? result.chosen : null,
        explanationHint: q.explanation || "",
      };
    });

    const system = `You are a warm, patient tutor for a 6 year old girl named Nandika preparing for the CogAT Level 8 gifted test. For each question she got wrong, write a 2 to 3 sentence explanation a 6 year old can follow. Start with "Let's look at this one together." Walk through the reasoning. Be encouraging. Never use the words wrong or incorrect. Never use em dashes. Output strictly valid JSON: { "explanations": [ { "questionId": string, "text": string } ] }. Output nothing outside the JSON.`;
    const userMsg = JSON.stringify(wrongPayload);

    const aiResult = await callAI({ task: "explain", system, user: userMsg, json: true });
    if (aiResult && aiResult.explanations && Array.isArray(aiResult.explanations)) {
      aiResult.explanations.forEach(e => { explanations[e.questionId] = e.text; });
    }
  }

  showResults(gradeData, explanations);
}

// ─── Results Screen ───────────────────────────────────────────────────────────

function showResults(gradeData, explanations) {
  const { score, total, percentage, results } = gradeData;
  const qs = todayQuestions || [];

  const stars = percentage >= 80 ? 3 : percentage >= 60 ? 2 : 1;
  const starsHtml = [1, 2, 3].map(i =>
    `<span class="text-4xl ${i <= stars ? "star-filled" : "star-empty"}">&#x2605;</span>`
  ).join("");

  const teluguMsg = percentage >= 80
    ? `<div class="text-center text-lg font-bold text-green-700 mt-2">Chala bagundi Nandika! <span class="text-sm font-normal text-gray-500">(Very good!)</span></div>`
    : "";

  const providerBadge = getProviderBadge();

  // Per-question accordion rows
  let qRows = "";
  results.forEach((r, i) => {
    const q = qs.find(q => q.id === r.questionId) || {};
    const cheer = getCheer();
    const isCorrect = r.isCorrect;
    // getCheer() returns a string (may include Telugu in parens)
    const explanation = isCorrect
      ? cheer
      : (explanations[r.questionId] || staticExplain(q));

    const rowBg = isCorrect ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200";
    const icon = isCorrect ? "&#x2705;" : "&#x274C;";
    const corrLabel = isCorrect ? "" : ` (correct: ${r.correct}, yours: ${r.chosen || "skipped"})`;

    qRows += `
    <div class="rounded-2xl border-2 ${rowBg} mb-2 overflow-hidden">
      <div class="accordion-header flex items-center gap-3 p-3 cursor-pointer" data-idx="${i}">
        <span class="text-lg">${icon}</span>
        <span class="font-bold text-sm flex-1">Q${i + 1}: ${(q.prompt || "").slice(0, 60)}...${corrLabel}</span>
        <span class="text-gray-400 text-sm" id="acc-arrow-${i}">+</span>
      </div>
      <div class="acc-body hidden px-4 pb-3 text-sm text-gray-700" id="acc-body-${i}">
        ${explanation}
      </div>
    </div>`;
  });

  const nextDayDone = isTodayDone();
  const milestone = checkMilestone(loadState());
  const milestoneHtml = milestone
    ? `<div class="bg-purple-100 border-2 border-purple-300 rounded-2xl p-4 text-center font-bold text-purple-700 mb-4">${milestone}</div>`
    : "";

  setHtml(`
  <div class="screen-fade max-w-lg mx-auto px-4 py-6">
    <h1 class="text-3xl font-extrabold text-center text-gray-800 mb-2">Results!</h1>

    <!-- Stars -->
    <div class="flex justify-center gap-1 mb-2">${starsHtml}</div>

    <!-- Score -->
    <div class="text-center text-5xl font-extrabold mb-1" style="color:#6C63FF">${score} / ${total}</div>
    <div class="text-center text-gray-500 mb-1">${percentage}%</div>
    ${teluguMsg}

    ${milestoneHtml}

    <!-- Confetti placeholder -->
    <canvas id="confetti-canvas" class="confetti-canvas" style="display:none;"></canvas>

    <!-- Per question review -->
    <h2 class="text-lg font-extrabold text-gray-700 mt-5 mb-2">Question Review</h2>
    <div id="accordion-list">
      ${qRows}
    </div>

    <!-- Provider badge -->
    <div class="flex justify-center mt-4 mb-4">
      <span class="provider-badge">&#x1F916; ${providerBadge}</span>
    </div>

    <!-- Done button -->
    <button id="done-btn"
      class="w-full bg-primary text-white font-extrabold text-xl rounded-full py-5 shadow-lg btn-choice"
      style="min-height:64px;">
      Back to Home
    </button>
  </div>`);

  // Confetti
  if (percentage >= 80 && typeof confetti !== "undefined") {
    const canvas = el("confetti-canvas");
    canvas.style.display = "block";
    const myConfetti = confetti.create(canvas, { resize: true, useWorker: false });
    myConfetti({ particleCount: 150, spread: 100, origin: { y: 0.5 } });
    setTimeout(() => {
      if (canvas) canvas.style.display = "none";
    }, 4000);
  }

  // Accordion
  document.querySelectorAll(".accordion-header").forEach(header => {
    header.addEventListener("click", () => {
      const idx = header.dataset.idx;
      const body = el(`acc-body-${idx}`);
      const arrow = el(`acc-arrow-${idx}`);
      if (body.classList.contains("hidden")) {
        body.classList.remove("hidden");
        if (arrow) arrow.textContent = "-";
      } else {
        body.classList.add("hidden");
        if (arrow) arrow.textContent = "+";
      }
    });
  });

  el("done-btn").addEventListener("click", showHome);
}

// ─── Skills Calendar ──────────────────────────────────────────────────────────

function showSkillsCalendar() {
  appState = loadState();
  const dayNum = appState.currentDay || 1;
  const doneHistory = new Set((appState.history || []).map(h => h.day));

  const cells = SKILLS_CALENDAR.map(entry => {
    const { day, theme, skill } = entry;
    let cls = "day-cell locked";
    let icon = "&#x1F512;";
    if (day < dayNum || doneHistory.has(day)) {
      cls = "day-cell completed";
      icon = "&#x2705;";
    } else if (day === dayNum) {
      cls = "day-cell today";
      icon = "&#x2B50;";
    }
    return `<div class="${cls}" title="${skill}">
      <span class="text-lg">${icon}</span>
      <span class="text-xs text-center leading-tight px-1">${day}</span>
    </div>`;
  }).join("");

  setHtml(`
  <div class="screen-fade max-w-lg mx-auto px-4 py-4">
    <div class="flex items-center gap-3 mb-4">
      <button id="cal-back-btn" class="text-gray-400 hover:text-gray-600 text-sm font-bold btn-choice px-3 py-2 rounded-xl bg-white border border-gray-200">
        Home
      </button>
      <h1 class="text-2xl font-extrabold text-gray-800">60-Day Skills Calendar</h1>
    </div>

    <div class="flex gap-4 mb-4 text-sm flex-wrap">
      <span class="flex items-center gap-1"><span class="day-cell completed w-7 h-7 text-xs">&#x2705;</span> Done</span>
      <span class="flex items-center gap-1"><span class="day-cell today w-7 h-7 text-xs">&#x2B50;</span> Today</span>
      <span class="flex items-center gap-1"><span class="day-cell locked w-7 h-7 text-xs">&#x1F512;</span> Locked</span>
    </div>

    <div class="grid grid-cols-6 gap-2 mb-6">
      ${cells}
    </div>

    <!-- Skill list for current day -->
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <h2 class="font-extrabold text-gray-700 mb-2">Today: Day ${dayNum}</h2>
      ${(() => {
        const s = getSkillForDay(dayNum);
        return s
          ? `<div class="callout-new-skill"><strong>${s.skill}</strong><p class="text-sm mt-1">${s.description || ""}</p></div>`
          : "<p class='text-gray-400'>No skill found for today.</p>";
      })()}
    </div>
  </div>`);

  el("cal-back-btn").addEventListener("click", showHome);
}

// ─── Parent Panel ─────────────────────────────────────────────────────────────

function showParentPanel() {
  activeParentTab = "progress";
  renderParentPanel();
}

function renderParentPanel() {
  appState = loadState();
  const state = appState;
  const tabs = [
    { id: "progress", label: "Progress" },
    { id: "apikeys", label: "API Keys" },
    { id: "exportimport", label: "Data" },
    { id: "reset", label: "Reset" },
  ];

  const tabBtns = tabs.map(t =>
    `<button class="tab-btn ${activeParentTab === t.id ? "active" : "inactive"} text-sm" data-ptab="${t.id}">${t.label}</button>`
  ).join("");

  let panelBody = "";

  if (activeParentTab === "progress") {
    const subtestRows = SUBTESTS.map(({ key }) => {
      const level = state.levelsBySubtest[key] || 3;
      return `<div class="flex justify-between items-center py-1 border-b border-gray-100">
        <span class="text-sm font-bold text-gray-700">${subtestDisplayName(key)}</span>
        <span class="text-sm text-primary font-extrabold">Level ${level}</span>
      </div>`;
    }).join("");

    // Chart: last 30 days overall score
    const history = (state.history || []).slice(-30);
    const chartLabels = history.map(h => "D" + h.day);
    const chartData = history.map(h => {
      // compute overall percentage from subtestResults
      let total = 0, score = 0;
      if (h.subtestResults) {
        Object.values(h.subtestResults).forEach(r => {
          total += r.total || 0;
          score += r.score || 0;
        });
      }
      return total > 0 ? Math.round((score / total) * 100) : 0;
    });

    const stats = state.providerStats || {};

    panelBody = `
      <div class="mb-4">
        <h3 class="font-bold text-gray-700 mb-1">Last 30 Days Score</h3>
        <canvas id="progress-chart" height="160"></canvas>
      </div>
      <div class="mb-4">
        <h3 class="font-bold text-gray-700 mb-2">Current Levels</h3>
        ${subtestRows}
      </div>
      <div class="bg-gray-50 rounded-xl p-3 text-sm text-gray-600">
        <div class="font-bold mb-1">Provider Stats</div>
        <div>DeepSeek: ${stats.deepseekSuccess || 0} ok / ${stats.deepseekFail || 0} failed</div>
        <div>Claude: ${stats.anthropicSuccess || 0} ok / ${stats.anthropicFail || 0} failed</div>
        <div>Vision calls: ${stats.visionCalls || 0}</div>
        <div>Offline fallbacks: ${stats.offlineFallback || 0}</div>
      </div>
      <script id="chart-data" type="application/json">${JSON.stringify({ labels: chartLabels, data: chartData })}<\/script>`;

  } else if (activeParentTab === "apikeys") {
    panelBody = `
      <p class="text-sm text-gray-500 mb-4">API keys are stored only in your browser (localStorage). They never leave your device.</p>
      <div class="mb-4">
        <label class="block font-bold text-gray-700 mb-1">DeepSeek API Key (text explanations)</label>
        <input type="password" id="deepseek-key-input" placeholder="sk-..." value="${state.apiKeys?.deepseek || ""}"
          class="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm" />
      </div>
      <div class="mb-4">
        <label class="block font-bold text-gray-700 mb-1">Anthropic API Key (photo and PDF grading)</label>
        <input type="password" id="anthropic-key-input" placeholder="sk-ant-..." value="${state.apiKeys?.anthropic || ""}"
          class="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm" />
      </div>
      <button id="save-keys-btn"
        class="w-full bg-primary text-white font-bold rounded-full py-3 btn-choice">
        Save Keys
      </button>
      <p class="text-xs text-gray-400 mt-3">Keys are stored in localStorage and never sent anywhere except directly to the respective AI API.</p>

      <div class="mt-5">
        <h3 class="font-bold text-gray-700 mb-2">Manual Difficulty Override</h3>
        ${SUBTESTS.map(({ key }) => {
          const level = state.levelsBySubtest[key] || 3;
          return `<div class="flex items-center justify-between mb-2">
            <span class="text-sm font-bold text-gray-700">${subtestDisplayName(key)}</span>
            <select class="level-override border rounded px-2 py-1 text-sm" data-key="${key}">
              ${[1,2,3,4,5,6,7,8,9,10].map(l => `<option value="${l}" ${l === level ? "selected" : ""}>${l}</option>`).join("")}
            </select>
          </div>`;
        }).join("")}
        <button id="save-levels-btn" class="w-full bg-green-500 text-white font-bold rounded-full py-2 btn-choice mt-2">Save Levels</button>
      </div>`;

  } else if (activeParentTab === "exportimport") {
    panelBody = `
      <p class="text-gray-500 text-sm mb-4">Export your progress to a JSON file, or import a previously saved file.</p>
      <button id="export-btn" class="w-full bg-primary text-white font-bold rounded-full py-3 btn-choice mb-3">
        Export Progress JSON
      </button>
      <div class="mb-3">
        <label class="block font-bold text-gray-700 mb-1">Import Progress JSON</label>
        <input type="file" id="import-input" accept="application/json" class="w-full border-2 border-dashed border-gray-300 rounded-xl p-3 text-sm" />
      </div>
      <button id="import-btn" class="w-full bg-orange-400 text-white font-bold rounded-full py-3 btn-choice">
        Import JSON
      </button>`;

  } else if (activeParentTab === "reset") {
    panelBody = `
      <div class="text-center py-4">
        <div class="text-6xl mb-4">&#x26A0;&#xFE0F;</div>
        <h3 class="text-xl font-extrabold text-red-600 mb-2">Reset All Progress</h3>
        <p class="text-gray-500 text-sm mb-6">This will erase all history, scores, and settings. This cannot be undone.</p>
        <button id="reset-confirm-btn"
          class="w-full bg-red-500 text-white font-bold rounded-full py-3 btn-choice">
          Yes, Reset Everything
        </button>
      </div>`;
  }

  document.body.insertAdjacentHTML("beforeend", `
  <div id="parent-overlay" class="parent-panel">
    <div class="bg-white rounded-3xl shadow-2xl w-full max-w-md p-5 relative my-4">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-extrabold text-gray-800">Parent Panel</h2>
        <button id="close-parent-btn" class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl btn-choice">
          &times;
        </button>
      </div>
      <div class="flex gap-2 mb-4 flex-wrap">${tabBtns}</div>
      <div id="parent-body">${panelBody}</div>
    </div>
  </div>`);

  el("close-parent-btn").addEventListener("click", () => {
    const overlay = el("parent-overlay");
    if (overlay) overlay.remove();
    if (progressChart) { progressChart.destroy(); progressChart = null; }
  });

  document.querySelectorAll("[data-ptab]").forEach(btn => {
    btn.addEventListener("click", () => {
      const overlay = el("parent-overlay");
      if (overlay) overlay.remove();
      if (progressChart) { progressChart.destroy(); progressChart = null; }
      activeParentTab = btn.dataset.ptab;
      renderParentPanel();
    });
  });

  // Initialize chart
  if (activeParentTab === "progress") {
    requestAnimationFrame(() => {
      const canvas = el("progress-chart");
      const dataEl = el("chart-data");
      if (canvas && dataEl && typeof Chart !== "undefined") {
        const { labels, data } = JSON.parse(dataEl.textContent);
        progressChart = new Chart(canvas, {
          type: "line",
          data: {
            labels,
            datasets: [{ label: "Score %", data, borderColor: "#6C63FF", backgroundColor: "rgba(108,99,255,0.1)", tension: 0.3, fill: true }]
          },
          options: {
            plugins: { legend: { display: false } },
            scales: { y: { min: 0, max: 100 } },
            responsive: true,
          }
        });
      }
    });
  }

  // API keys save
  const saveKeysBtn = el("save-keys-btn");
  if (saveKeysBtn) {
    saveKeysBtn.addEventListener("click", () => {
      const dk = el("deepseek-key-input").value.trim();
      const ak = el("anthropic-key-input").value.trim();
      updateState({ apiKeys: { deepseek: dk || null, anthropic: ak || null } });
      saveKeysBtn.textContent = "Saved!";
      setTimeout(() => { saveKeysBtn.textContent = "Save Keys"; }, 1500);
    });
  }

  // Level override save
  const saveLevelsBtn = el("save-levels-btn");
  if (saveLevelsBtn) {
    saveLevelsBtn.addEventListener("click", () => {
      const overrides = {};
      document.querySelectorAll(".level-override").forEach(sel => {
        overrides[sel.dataset.key] = parseInt(sel.value);
      });
      updateState({ levelsBySubtest: overrides });
      saveLevelsBtn.textContent = "Saved!";
      setTimeout(() => { saveLevelsBtn.textContent = "Save Levels"; }, 1500);
    });
  }

  // Export
  const exportBtn = el("export-btn");
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      const json = exportJSON();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nandika-prep-${today()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  // Import
  const importBtn = el("import-btn");
  if (importBtn) {
    importBtn.addEventListener("click", async () => {
      const importInput = el("import-input");
      if (!importInput || !importInput.files.length) {
        alert("Please select a JSON file first.");
        return;
      }
      const text = await importInput.files[0].text();
      try {
        importJSON(text);
        alert("Progress imported successfully!");
        const overlay = el("parent-overlay");
        if (overlay) overlay.remove();
        showHome();
      } catch(e) {
        alert("Import failed: " + e.message);
      }
    });
  }

  // Reset
  const resetBtn = el("reset-confirm-btn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (confirm("Are you absolutely sure? All progress will be lost forever.")) {
        resetState();
        const overlay = el("parent-overlay");
        if (overlay) overlay.remove();
        todayQuestions = null;
        sessionAnswers = new Map();
        appState = loadState();
        showHome();
      }
    });
  }
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

window.addEventListener("DOMContentLoaded", () => {
  // Set pdf.js worker source if loaded
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }
  appState = loadState();
  showHome();
});
