// kumon.js - Kumon Drill Module (additive, does not touch CogAT paths)

import { dateToSeed, SeededRandom } from './lib/seed.js';
import { loadState, updateState } from './lib/storage.js';
import { callAI } from './lib/ai.js';
import { speak, isSupported as speechSupported } from './lib/speech.js';
import { DrillTimer, formatTime } from './lib/timer.js';
import { evaluateMasteryAfterDrill, applyMasteryResult, getMasteryStatus } from './lib/kumon-mastery.js';
import { generate as genMath } from './generators/kumon-math.js';
import { generate as genRead } from './generators/kumon-reading.js';

// ── Module globals ─────────────────────────────────────────────────────────────

let _goHome = null;
let activeTimer = null;
let mathDrill = null;
let readDrill = null;
let owlPose = 1;
const KUMON_SESSION_KEY = 'nandikaPrep_kumonSession';

// ── Init ───────────────────────────────────────────────────────────────────────

export function initKumon(goHomeCallback) {
  _goHome = goHomeCallback;
}

// ── Utilities ──────────────────────────────────────────────────────────────────

function setHtml(html) {
  document.getElementById('app').innerHTML = html;
}

function el(id) {
  return document.getElementById(id);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function stopActiveTimer() {
  if (activeTimer) { activeTimer.stop(); activeTimer = null; }
}

function savePartial(type, data) {
  try { localStorage.setItem(KUMON_SESSION_KEY, JSON.stringify({ type, date: today(), ...data })); } catch {}
}

function clearPartial() {
  try { localStorage.removeItem(KUMON_SESSION_KEY); } catch {}
}

// ── Today completion checks ────────────────────────────────────────────────────

export function isKumonMathDoneToday() {
  const state = loadState();
  return (state.kumon?.math?.history || []).some(e => e.date === today());
}

export function isKumonReadingDoneToday() {
  const state = loadState();
  return (state.kumon?.reading?.history || []).some(e => e.date === today());
}

export function isKumonBothDoneToday() {
  return isKumonMathDoneToday() && isKumonReadingDoneToday();
}

// ── Mastery Tree SVG ───────────────────────────────────────────────────────────

function masteryTreeSVG(level, color) {
  const leaves = [];
  for (let i = 0; i < 12; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const cx = 16 + col * 24;
    const cy = 12 + row * 16;
    const filled = i < level;
    leaves.push(`<circle cx="${cx}" cy="${cy}" r="6" fill="${filled ? color : '#E5E7EB'}" />`);
    if (filled) leaves.push(`<text x="${cx}" y="${cy+3}" text-anchor="middle" font-size="6" fill="white" font-weight="bold">${i+1}</text>`);
  }
  return `<svg width="80" height="85" viewBox="0 0 80 85" xmlns="http://www.w3.org/2000/svg">
    ${leaves.join('')}
    <rect x="36" y="70" width="8" height="14" rx="2" fill="#8B5E3C"/>
  </svg>`;
}

// ── Home Section HTML ──────────────────────────────────────────────────────────

export function kumonHomeHTML(state) {
  if (!state.kumon?.enabled) return '';

  const mathLevel = state.kumon.math?.level || 3;
  const readLevel = state.kumon.reading?.level || 3;
  const mathDone = isKumonMathDoneToday();
  const readDone = isKumonReadingDoneToday();
  const bothDone = mathDone && readDone;
  const mathStatus = getMasteryStatus(state.kumon.math || {});
  const readStatus = getMasteryStatus(state.kumon.reading || {});

  const owlSrc = `./assets/icons/owl-${owlPose}.svg`;
  owlPose = (owlPose % 5) + 1;

  return `
  <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
    <div class="flex items-center gap-3 mb-3">
      <img src="${owlSrc}" width="48" height="48" alt="Owl" onerror="this.style.display='none'" />
      <div>
        <h2 class="text-lg font-extrabold text-gray-800">Kumon Drill</h2>
        <p class="text-gray-500 text-xs">Speed and accuracy practice</p>
      </div>
      ${bothDone ? '<span class="ml-auto text-2xl">&#x1F31F;</span>' : ''}
    </div>

    ${bothDone ? `<div class="bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-xl p-2 text-center font-extrabold text-sm mb-3">Double Day! Both drills done. Amazing!</div>` : ''}

    <div class="flex justify-center gap-4 mb-3">
      <div class="text-center">
        ${masteryTreeSVG(mathLevel, '#F39C12')}
        <div class="text-xs font-bold text-yellow-600 mt-1">Math Lv ${mathLevel}</div>
        <div class="text-xs text-gray-400">${mathStatus.displayDots}</div>
      </div>
      <div class="text-center">
        ${masteryTreeSVG(readLevel, '#6C63FF')}
        <div class="text-xs font-bold text-purple-600 mt-1">Reading Lv ${readLevel}</div>
        <div class="text-xs text-gray-400">${readStatus.displayDots}</div>
      </div>
    </div>

    <div class="flex gap-2 mb-3 text-xs">
      <div class="flex-1 bg-yellow-50 rounded-xl p-2 text-center">
        <div class="font-bold text-yellow-700">Math</div>
        <div class="${mathDone ? 'text-green-600 font-bold' : 'text-gray-400'}">${mathDone ? 'Done today!' : 'Not done'}</div>
      </div>
      <div class="flex-1 bg-purple-50 rounded-xl p-2 text-center">
        <div class="font-bold text-purple-700">Reading</div>
        <div class="${readDone ? 'text-green-600 font-bold' : 'text-gray-400'}">${readDone ? 'Done today!' : 'Not done'}</div>
      </div>
    </div>

    <button id="start-kumon-btn"
      class="w-full font-extrabold text-lg rounded-full py-4 shadow btn-choice transition-all"
      style="background:linear-gradient(135deg,#F39C12,#E67E22);color:white;min-height:56px;">
      Today's Kumon Drill
    </button>
  </div>`;
}

// ── Kumon Menu ─────────────────────────────────────────────────────────────────

export function showKumonMenu() {
  stopActiveTimer();
  const state = loadState();
  const mathLevel = state.kumon?.math?.level || 3;
  const readLevel = state.kumon?.reading?.level || 3;
  const mathDone = isKumonMathDoneToday();
  const readDone = isKumonReadingDoneToday();

  setHtml(`
  <div class="screen-fade max-w-lg mx-auto px-4 py-6">
    <div class="flex items-center gap-3 mb-5">
      <button id="kumon-back-btn" class="text-gray-400 hover:text-gray-600 font-bold btn-choice px-3 py-2 rounded-xl bg-white border border-gray-200">Home</button>
      <h1 class="text-2xl font-extrabold text-gray-800">Today's Kumon Drill</h1>
    </div>
    <p class="text-gray-500 text-sm mb-5">Each drill is timed. The goal is 100% correct within the standard time.</p>

    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
      <div class="flex items-center gap-3 mb-3">
        <span class="text-3xl">&#x1F4CA;</span>
        <div class="flex-1">
          <div class="font-extrabold text-gray-800 text-lg">Math Drill</div>
          <div class="text-gray-400 text-sm">Level ${mathLevel}</div>
        </div>
        ${mathDone ? '<span class="text-green-600 font-extrabold">Done!</span>' : ''}
      </div>
      <button id="start-math-btn"
        class="w-full font-extrabold text-lg rounded-full py-4 btn-choice transition-all"
        style="${mathDone ? 'background:#D1FAE5;color:#065F46;border:2px solid #2ECC71;' : 'background:#F39C12;color:white;'} min-height:56px;">
        ${mathDone ? 'Redo Math Drill' : 'Start Math Drill'}
      </button>
    </div>

    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div class="flex items-center gap-3 mb-3">
        <span class="text-3xl">&#x1F4D6;</span>
        <div class="flex-1">
          <div class="font-extrabold text-gray-800 text-lg">Reading and Writing Drill</div>
          <div class="text-gray-400 text-sm">Level ${readLevel}</div>
        </div>
        ${readDone ? '<span class="text-purple-600 font-extrabold">Done!</span>' : ''}
      </div>
      <button id="start-reading-btn"
        class="w-full font-extrabold text-lg rounded-full py-4 btn-choice transition-all"
        style="${readDone ? 'background:#EDE9FE;color:#5B21B6;border:2px solid #6C63FF;' : 'background:#6C63FF;color:white;'} min-height:56px;">
        ${readDone ? 'Redo Reading Drill' : 'Start Reading Drill'}
      </button>
    </div>
  </div>`);

  el('kumon-back-btn').addEventListener('click', () => _goHome && _goHome());
  el('start-math-btn').addEventListener('click', startMathDrill);
  el('start-reading-btn').addEventListener('click', startReadingDrill);
}

// ── Math Drill ─────────────────────────────────────────────────────────────────

function startMathDrill() {
  const state = loadState();
  const level = state.kumon?.math?.level || 3;
  const rng = new SeededRandom(dateToSeed(today()) + 1000);
  const worksheet = genMath(level, rng);

  mathDrill = {
    worksheet, level,
    currentIndex: 0,
    answers: [],
    timer: new DrillTimer(tick => {
      const t = el('kumon-math-timer');
      if (t) t.textContent = formatTime(tick);
      const bar = el('kumon-math-sct-bar');
      if (bar) {
        const pct = Math.min(100, Math.round((tick / worksheet.sct_seconds) * 100));
        bar.style.width = pct + '%';
        bar.style.background = tick > worksheet.sct_seconds ? '#E74C3C' : '#2ECC71';
      }
    }),
  };
  activeTimer = mathDrill.timer;
  mathKeyBuffer = '';
  renderMathQuestion();
  mathDrill.timer.start();
}

let mathKeyBuffer = '';

function renderMathQuestion() {
  if (!mathDrill) return;
  const { worksheet, currentIndex } = mathDrill;
  const q = worksheet.questions[currentIndex];
  const total = worksheet.questions.length;
  mathKeyBuffer = '';

  setHtml(`
  <div class="screen-fade max-w-lg mx-auto px-4 py-4">
    <div class="flex items-center justify-between mb-1">
      <span class="font-extrabold text-2xl tabular-nums" id="kumon-math-timer" style="color:#F39C12;">${formatTime(mathDrill.timer.getElapsed())}</span>
      <span class="text-gray-500 text-sm">Q ${currentIndex + 1} of ${total}</span>
      <span class="text-gray-400 text-xs">SCT ${formatTime(worksheet.sct_seconds)}</span>
    </div>
    <div class="progress-bar-track mb-1" style="height:6px;">
      <div id="kumon-math-sct-bar" style="height:100%;width:0%;border-radius:999px;transition:width 1s;background:#2ECC71;"></div>
    </div>
    <div class="progress-bar-track mb-5" style="height:6px;">
      <div style="height:100%;width:${Math.round((currentIndex/total)*100)}%;background:linear-gradient(90deg,#F39C12,#E67E22);border-radius:999px;"></div>
    </div>

    <div class="bg-white rounded-3xl shadow-lg border-2 border-orange-100 p-6 mb-5 text-center">
      <div class="text-5xl font-extrabold text-gray-800 tabular-nums" style="letter-spacing:2px;">
        ${q.prompt} = <span id="math-answer-display" style="color:#F39C12;min-width:60px;display:inline-block;border-bottom:3px solid #F39C12;">&thinsp;</span>
      </div>
    </div>

    <div class="grid grid-cols-3 gap-3">
      ${[1,2,3,4,5,6,7,8,9].map(n =>
        `<button class="kp-btn bg-white border-2 border-gray-200 rounded-2xl text-3xl font-extrabold text-gray-700 py-4 btn-choice hover:border-orange-400 hover:bg-orange-50 active:scale-95 transition-all" data-d="${n}">${n}</button>`
      ).join('')}
      <button class="kp-btn bg-white border-2 border-gray-200 rounded-2xl text-2xl font-extrabold text-gray-500 py-4 btn-choice hover:bg-gray-50 active:scale-95 transition-all" data-d="back">&#x232B;</button>
      <button class="kp-btn bg-white border-2 border-gray-200 rounded-2xl text-3xl font-extrabold text-gray-700 py-4 btn-choice hover:border-orange-400 hover:bg-orange-50 active:scale-95 transition-all" data-d="0">0</button>
      <button id="math-next-btn" class="bg-orange-400 hover:bg-orange-500 text-white rounded-2xl text-xl font-extrabold py-4 btn-choice active:scale-95 transition-all">Next</button>
    </div>
  </div>`);

  document.querySelectorAll('.kp-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const d = btn.dataset.d;
      if (d === 'back') { mathKeyBuffer = mathKeyBuffer.slice(0, -1); }
      else if (mathKeyBuffer.length < 4) { mathKeyBuffer += d; }
      const disp = el('math-answer-display');
      if (disp) disp.textContent = mathKeyBuffer || '​';
    });
  });

  el('math-next-btn').addEventListener('click', submitMathAnswer);
  document.addEventListener('keydown', mathKeyHandler);
}

function mathKeyHandler(e) {
  if (!mathDrill) { document.removeEventListener('keydown', mathKeyHandler); return; }
  if (e.key >= '0' && e.key <= '9') {
    if (mathKeyBuffer.length < 4) mathKeyBuffer += e.key;
    const disp = el('math-answer-display');
    if (disp) disp.textContent = mathKeyBuffer;
  } else if (e.key === 'Backspace') {
    mathKeyBuffer = mathKeyBuffer.slice(0, -1);
    const disp = el('math-answer-display');
    if (disp) disp.textContent = mathKeyBuffer || '​';
  } else if (e.key === 'Enter') {
    submitMathAnswer();
  }
}

function submitMathAnswer() {
  if (!mathDrill) return;
  document.removeEventListener('keydown', mathKeyHandler);
  const q = mathDrill.worksheet.questions[mathDrill.currentIndex];
  const given = mathKeyBuffer === '' ? null : parseInt(mathKeyBuffer, 10);
  const isCorrect = given !== null && given === q.correct;

  mathDrill.answers.push({ id: q.id, prompt: q.prompt, given, correct: q.correct, isCorrect });

  const disp = el('math-answer-display');
  if (disp) disp.style.color = isCorrect ? '#2ECC71' : '#E74C3C';

  if ((mathDrill.currentIndex + 1) % 5 === 0) {
    savePartial('math', { level: mathDrill.level, questionIndex: mathDrill.currentIndex + 1, answers: mathDrill.answers });
  }

  mathDrill.currentIndex++;

  if (mathDrill.currentIndex >= mathDrill.worksheet.questions.length) {
    const elapsed = mathDrill.timer.stop();
    activeTimer = null;
    clearPartial();
    setTimeout(() => showMathResults(elapsed), 400);
  } else {
    setTimeout(() => {
      document.addEventListener('keydown', mathKeyHandler);
      renderMathQuestion();
    }, 300);
  }
}

function showMathResults(elapsed) {
  if (!mathDrill) return;
  const { answers, worksheet, level } = mathDrill;
  const total = answers.length;
  const correct = answers.filter(a => a.isCorrect).length;
  const accuracy = Math.round((correct / total) * 100);
  const perfectDay = accuracy === 100 && elapsed <= worksheet.sct_seconds;

  const state = loadState();
  const drillResult = { date: today(), level, accuracy, timeSeconds: elapsed, sctSeconds: worksheet.sct_seconds, perfectDay };
  const evaluation = evaluateMasteryAfterDrill(state.kumon.math, drillResult);
  applyMasteryResult(state.kumon.math, evaluation);

  if (perfectDay && !state.badges.includes('first-perfect-day')) state.badges.push('first-perfect-day');
  updateState({ kumon: state.kumon, badges: state.badges });

  const actionMsg = { advance: `Math Level ${evaluation.newLevel} unlocked!`, drop: `Practicing Level ${evaluation.newLevel} tomorrow.`, hold: '' }[evaluation.action] || '';
  const stars = perfectDay ? 3 : accuracy >= 80 ? 2 : 1;
  const starsHtml = [1,2,3].map(i => `<span class="text-3xl ${i<=stars?'star-filled':'star-empty'}">&#x2605;</span>`).join('');

  const rows = answers.map((a, i) =>
    `<div class="flex items-center gap-2 py-1 border-b border-gray-50 text-sm">
      <span class="text-gray-400 w-5 text-right text-xs">${i+1}</span>
      <span class="flex-1 font-mono text-gray-700">${a.prompt} = ${a.given ?? '?'}</span>
      ${!a.isCorrect ? `<span class="text-red-500 font-bold text-xs">(${a.correct})</span>` : ''}
      <span>${a.isCorrect ? '&#x2705;' : '&#x274C;'}</span>
    </div>`
  ).join('');

  setHtml(`
  <div class="screen-fade max-w-lg mx-auto px-4 py-6">
    <h1 class="text-3xl font-extrabold text-center text-gray-800 mb-2">Math Results!</h1>
    <div class="flex justify-center gap-1 mb-3">${starsHtml}</div>

    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4 text-center">
      <div class="text-5xl font-extrabold mb-1 tabular-nums" style="color:#F39C12;">${correct} / ${total}</div>
      <div class="text-gray-500 text-lg mb-1">${accuracy}%</div>
      <div class="font-bold text-gray-600">Time: ${formatTime(elapsed)}
        ${elapsed <= worksheet.sct_seconds
          ? '<span class="text-green-600 ml-1">within SCT!</span>'
          : `<span class="text-red-400 ml-1">(SCT: ${formatTime(worksheet.sct_seconds)})</span>`}
      </div>
      ${perfectDay ? '<div class="mt-2 text-xl font-extrabold text-green-600">Perfect Day! Shabaash Nandika!</div>' : ''}
    </div>

    ${actionMsg ? `<div class="callout-new-skill mb-4 text-center font-bold">${actionMsg}</div>` : ''}

    <details class="bg-white rounded-2xl shadow-sm border border-gray-100 mb-5 overflow-hidden">
      <summary class="p-4 font-extrabold text-gray-700 cursor-pointer select-none">Show All ${total} Questions</summary>
      <div class="px-4 pb-3 max-h-72 overflow-y-auto">${rows}</div>
    </details>

    <div class="flex gap-3">
      <button id="mr-home" class="flex-1 bg-primary text-white font-extrabold text-lg rounded-full py-4 btn-choice">Home</button>
      <button id="mr-menu" class="flex-1 font-extrabold text-lg rounded-full py-4 btn-choice border-2" style="border-color:#F39C12;color:#F39C12;">Kumon Menu</button>
    </div>
  </div>`);

  if (perfectDay && typeof confetti !== 'undefined') confetti({ particleCount: 100, spread: 80, origin: { y: 0.4 } });
  el('mr-home').addEventListener('click', () => { mathDrill = null; _goHome && _goHome(); });
  el('mr-menu').addEventListener('click', () => { mathDrill = null; showKumonMenu(); });
}

// ── Reading Drill ──────────────────────────────────────────────────────────────

function startReadingDrill() {
  const state = loadState();
  const level = state.kumon?.reading?.level || 3;
  const rng = new SeededRandom(dateToSeed(today()) + 2000);
  const worksheet = genRead(level, rng);

  readDrill = {
    worksheet, level,
    currentIndex: 0,
    answers: [],
    timer: new DrillTimer(tick => {
      const t = el('kumon-read-timer');
      if (t) t.textContent = formatTime(tick);
    }),
    writingText: '',
  };
  activeTimer = readDrill.timer;
  renderReadItem();
  readDrill.timer.start();
}

function renderReadItem() {
  if (!readDrill) return;
  const { worksheet, currentIndex } = readDrill;
  const item = worksheet.items[currentIndex];
  const total = worksheet.items.length;
  const elapsed = readDrill.timer.getElapsed();
  const hasChoices = item.choices && item.choices.length > 0;

  let passageHtml = item.passage
    ? `<div class="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-3 text-gray-700 text-sm leading-relaxed">${item.passage}</div>`
    : '';

  let inputHtml = '';
  if (hasChoices) {
    inputHtml = `<div class="flex flex-col gap-2" id="read-choices">` +
      item.choices.map((c, idx) =>
        `<button class="rc-btn w-full text-left bg-white border-2 border-gray-200 rounded-2xl px-4 py-3 font-bold text-gray-700 btn-choice hover:border-primary hover:bg-purple-50 active:scale-95 transition-all" data-idx="${idx}">
          <span class="text-primary font-extrabold mr-2">${String.fromCharCode(65 + idx)}.</span>${c}
        </button>`
      ).join('') + `</div>`;
  } else {
    inputHtml = `<div class="flex gap-2">
      <input type="text" id="read-fill" class="flex-1 border-2 border-gray-200 rounded-xl px-4 py-3 text-lg font-bold focus:border-primary focus:outline-none" placeholder="Type your answer..." autocomplete="off" autocorrect="off" />
      <button id="fill-next" class="bg-primary text-white rounded-xl px-5 font-extrabold btn-choice">Next</button>
    </div>`;
  }

  setHtml(`
  <div class="screen-fade max-w-lg mx-auto px-4 py-4">
    <div class="flex items-center justify-between mb-2">
      <span class="font-extrabold text-xl tabular-nums" id="kumon-read-timer" style="color:#6C63FF;">${formatTime(elapsed)}</span>
      <span class="text-gray-500 text-sm">Item ${currentIndex + 1} of ${total}</span>
    </div>
    <div class="progress-bar-track mb-4" style="height:6px;">
      <div style="height:100%;width:${Math.round((currentIndex/total)*100)}%;background:linear-gradient(90deg,#6C63FF,#FF6B9D);border-radius:999px;"></div>
    </div>

    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-3">
      <div class="flex items-center gap-2 mb-2">
        ${speechSupported() ? `<button id="read-speak" class="w-9 h-9 flex items-center justify-center rounded-full bg-purple-100 hover:bg-purple-200 text-xl btn-choice flex-shrink-0">&#x1F50A;</button>` : ''}
        <span class="text-xs font-bold text-gray-400 uppercase tracking-wide">${item.type}</span>
      </div>
      ${passageHtml}
      <p class="font-bold text-gray-800 text-lg mb-4 leading-snug">${item.prompt}</p>
      ${inputHtml}
    </div>
  </div>`);

  const speakEl = el('read-speak');
  if (speakEl) {
    speakEl.addEventListener('click', () => {
      const txt = (item.passage ? item.passage + '. ' : '') + item.prompt;
      speak(txt, { rate: 0.85 }).catch(() => {});
    });
  }

  const advanceRead = (chosen) => {
    const isCorrect = item.correct !== undefined ? chosen === item.correct : true;
    readDrill.answers.push({ id: item.id, type: item.type, chosen, correct: item.correct, isCorrect });
    if ((readDrill.currentIndex + 1) % 5 === 0) {
      savePartial('reading', { level: readDrill.level, itemIndex: readDrill.currentIndex + 1, answers: readDrill.answers });
    }
    readDrill.currentIndex++;
    if (readDrill.currentIndex >= readDrill.worksheet.items.length) {
      readDrill.timer.pause();
      setTimeout(() => showWritingPrompt(), 350);
    } else {
      setTimeout(() => renderReadItem(), 320);
    }
  };

  if (hasChoices) {
    document.querySelectorAll('.rc-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.rc-btn').forEach(b => b.disabled = true);
        const chosen = item.choices[parseInt(btn.dataset.idx)];
        const isCorrect = chosen === item.correct;
        btn.style.borderColor = isCorrect ? '#2ECC71' : '#E74C3C';
        advanceRead(chosen);
      });
    });
  } else {
    const submit = () => advanceRead((el('read-fill')?.value || '').trim().toLowerCase());
    el('fill-next')?.addEventListener('click', submit);
    el('read-fill')?.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
    el('read-fill')?.focus();
  }
}

function showWritingPrompt() {
  if (!readDrill) return;
  const { writingPrompt } = readDrill.worksheet;
  const elapsed = readDrill.timer.getElapsed();

  setHtml(`
  <div class="screen-fade max-w-lg mx-auto px-4 py-6">
    <h2 class="text-2xl font-extrabold text-gray-800 mb-1">Writing Time!</h2>
    <p class="text-gray-500 text-sm mb-4">Timer is paused. Write your best answer.</p>

    <div class="callout-new-skill mb-4">
      <div class="font-extrabold text-yellow-700 mb-1">Your prompt:</div>
      <p class="text-gray-800 text-lg font-bold leading-snug">${writingPrompt.text}</p>
      ${speechSupported() ? `<button id="wp-speak" class="mt-2 text-yellow-600 text-sm underline btn-choice">Read it to me</button>` : ''}
    </div>

    <textarea id="writing-input"
      class="w-full border-2 border-gray-200 rounded-2xl p-4 text-base font-bold focus:border-primary focus:outline-none resize-none"
      rows="5" maxlength="${writingPrompt.maxChars}" placeholder="Write here..."
      style="min-height:120px;"></textarea>

    <div class="flex justify-between text-xs text-gray-400 mb-5 px-1 mt-1">
      <span>At least ${writingPrompt.minChars} characters</span>
      <span id="wc">0 / ${writingPrompt.maxChars}</span>
    </div>

    <button id="submit-writing"
      class="w-full bg-primary text-white font-extrabold text-xl rounded-full py-5 btn-choice shadow-lg"
      style="min-height:64px;">
      Submit Writing
    </button>
    <p class="text-center text-gray-400 text-sm mt-3">Reading time: ${formatTime(elapsed)}</p>
  </div>`);

  const ta = el('writing-input');
  const wc = el('wc');
  ta?.addEventListener('input', () => { if (wc) wc.textContent = `${ta.value.length} / ${writingPrompt.maxChars}`; });
  ta?.focus();

  el('wp-speak')?.addEventListener('click', () => speak(writingPrompt.text, { rate: 0.85 }).catch(() => {}));
  if (speechSupported()) speak(writingPrompt.text, { rate: 0.85 }).catch(() => {});

  el('submit-writing').addEventListener('click', async () => {
    const text = (ta?.value || '').trim();
    if (text.length < writingPrompt.minChars) {
      const btn = el('submit-writing');
      btn.textContent = `Need at least ${writingPrompt.minChars} characters!`;
      setTimeout(() => { if (el('submit-writing')) el('submit-writing').textContent = 'Submit Writing'; }, 2000);
      return;
    }
    readDrill.writingText = text;
    el('submit-writing').textContent = 'Grading your writing...';
    el('submit-writing').disabled = true;
    await gradeWritingAndShowResults(text, elapsed);
  });
}

async function gradeWritingAndShowResults(writingText, readingElapsed) {
  if (!readDrill) return;

  const system = `You are reviewing a 6 year old's short writing sample. Score on three dimensions, each 0 to 3: SpellingAndLetters, GrammarAndCapitalization, IdeasAndCompleteness. Total max 9. For each dimension, write one short kid-friendly note. Be very encouraging. Never use the words wrong, incorrect, or bad. Never use em dashes. Output strictly valid JSON: { "scores": { "spelling": number, "grammar": number, "ideas": number }, "notes": { "spelling": string, "grammar": string, "ideas": string }, "encouragement": string }. Output nothing outside the JSON.`;
  const user = `Level ${readDrill.level} prompt: "${readDrill.worksheet.writingPrompt.text}"\n\nNandika wrote: "${writingText}"`;

  const aiResult = await callAI({ task: 'writing-grade', system, user, json: true });
  const scores = (aiResult && aiResult.scores) ? aiResult : {
    scores: { spelling: 2, grammar: 2, ideas: 2 },
    notes: { spelling: 'Nice letters!', grammar: 'Good sentences!', ideas: 'Great ideas!' },
    encouragement: 'You did a wonderful job writing today, Nandika!',
  };

  clearPartial();
  showReadingResults(writingText, readingElapsed, scores);
}

function showReadingResults(writingText, readingElapsed, writingScores) {
  if (!readDrill) return;
  const { answers, worksheet, level } = readDrill;
  const total = answers.length;
  const correct = answers.filter(a => a.isCorrect).length;
  const accuracy = Math.round((correct / total) * 100);

  const state = loadState();
  const drillResult = {
    date: today(), level, accuracy,
    timeSeconds: readingElapsed, sctSeconds: worksheet.sct_seconds,
    writingScores: writingScores.scores, writingTranscript: writingText,
  };
  const evaluation = evaluateMasteryAfterDrill(state.kumon.reading, drillResult);
  applyMasteryResult(state.kumon.reading, drillResult);
  updateState({ kumon: state.kumon, badges: state.badges || [] });

  const actionMsg = {
    advance: `Reading Level ${evaluation.newLevel} unlocked!`,
    drop: `Practicing Level ${evaluation.newLevel} tomorrow.`,
    hold: '',
  }[evaluation.action] || '';

  const starBar = (n) => '&#x2605;'.repeat(n) + '<span style="color:#D1D5DB;">' + '&#x2605;'.repeat(3-n) + '</span>';
  const { scores, notes, encouragement } = writingScores;
  const overallStars = accuracy >= 90 ? 3 : accuracy >= 70 ? 2 : 1;
  const starsHtml = [1,2,3].map(i => `<span class="text-3xl ${i<=overallStars?'star-filled':'star-empty'}">&#x2605;</span>`).join('');

  setHtml(`
  <div class="screen-fade max-w-lg mx-auto px-4 py-6">
    <h1 class="text-3xl font-extrabold text-center text-gray-800 mb-2">Reading Results!</h1>
    <div class="flex justify-center gap-1 mb-4">${starsHtml}</div>

    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4 text-center">
      <div class="text-4xl font-extrabold mb-1 tabular-nums" style="color:#6C63FF;">${correct} / ${total}</div>
      <div class="text-gray-500">${accuracy}% correct | Time: ${formatTime(readingElapsed)}</div>
    </div>

    ${actionMsg ? `<div class="callout-new-skill mb-4 text-center font-bold">${actionMsg}</div>` : ''}

    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-5">
      <h3 class="font-extrabold text-gray-700 mb-2">Writing</h3>
      <div class="bg-purple-50 rounded-xl p-3 mb-3 text-gray-800 font-bold text-sm leading-relaxed">"${writingText}"</div>
      <div class="grid grid-cols-3 gap-2 mb-3 text-center text-xs">
        <div>
          <div class="font-bold text-gray-500 mb-1">Spelling</div>
          <div style="color:#F39C12;">${starBar(scores.spelling || 0)}</div>
          <div class="text-gray-400 mt-1 leading-tight">${notes.spelling || ''}</div>
        </div>
        <div>
          <div class="font-bold text-gray-500 mb-1">Grammar</div>
          <div style="color:#F39C12;">${starBar(scores.grammar || 0)}</div>
          <div class="text-gray-400 mt-1 leading-tight">${notes.grammar || ''}</div>
        </div>
        <div>
          <div class="font-bold text-gray-500 mb-1">Ideas</div>
          <div style="color:#F39C12;">${starBar(scores.ideas || 0)}</div>
          <div class="text-gray-400 mt-1 leading-tight">${notes.ideas || ''}</div>
        </div>
      </div>
      <div class="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
        <p class="font-extrabold text-green-700">${encouragement || 'Great writing, Nandika!'}</p>
      </div>
    </div>

    <div class="flex gap-3">
      <button id="rr-home" class="flex-1 bg-primary text-white font-extrabold text-lg rounded-full py-4 btn-choice">Home</button>
      <button id="rr-menu" class="flex-1 font-extrabold text-lg rounded-full py-4 btn-choice border-2" style="border-color:#6C63FF;color:#6C63FF;">Kumon Menu</button>
    </div>
  </div>`);

  if (accuracy >= 90 && typeof confetti !== 'undefined') confetti({ particleCount: 80, spread: 70, origin: { y: 0.4 } });
  el('rr-home').addEventListener('click', () => { readDrill = null; _goHome && _goHome(); });
  el('rr-menu').addEventListener('click', () => { readDrill = null; showKumonMenu(); });
}

// ── Parent Panel Tab ───────────────────────────────────────────────────────────

export function kumonParentTabHTML(state) {
  const kumon = state.kumon || {};
  const mathLevel = kumon.math?.level || 3;
  const readLevel = kumon.reading?.level || 3;
  const enabled = kumon.enabled !== false;
  const speedMode = kumon.speedMode !== false;
  const mathHistory = (kumon.math?.history || []).slice(-30);
  const readHistory = (kumon.reading?.history || []).slice(-30);

  return `
  <div class="mb-4 space-y-3">
    <div class="flex items-center justify-between">
      <span class="font-bold text-gray-700">Kumon Mode Enabled</span>
      <input type="checkbox" id="k-enabled" ${enabled ? 'checked' : ''} class="w-5 h-5 accent-purple-600" />
    </div>
    <div class="flex items-center justify-between">
      <span class="font-bold text-gray-700">Speed Mode (timer visible)</span>
      <input type="checkbox" id="k-speed" ${speedMode ? 'checked' : ''} class="w-5 h-5 accent-orange-500" />
    </div>
  </div>

  <div class="mb-4">
    <h3 class="font-bold text-gray-700 mb-2">Level Overrides</h3>
    <div class="flex items-center justify-between mb-2">
      <span class="text-sm font-bold text-gray-700">Math Level</span>
      <select id="k-math-lv" class="border rounded px-2 py-1 text-sm">
        ${[1,2,3,4,5,6,7,8,9,10,11,12].map(l => `<option value="${l}" ${l===mathLevel?'selected':''}>${l}</option>`).join('')}
      </select>
    </div>
    <div class="flex items-center justify-between mb-3">
      <span class="text-sm font-bold text-gray-700">Reading Level</span>
      <select id="k-read-lv" class="border rounded px-2 py-1 text-sm">
        ${[1,2,3,4,5,6,7,8,9,10,11,12].map(l => `<option value="${l}" ${l===readLevel?'selected':''}>${l}</option>`).join('')}
      </select>
    </div>
    <button id="k-save-btn" class="w-full bg-primary text-white font-bold rounded-full py-2 btn-choice text-sm">Save Kumon Settings</button>
  </div>

  <div class="mb-4">
    <h3 class="font-bold text-gray-700 mb-2">Math History (last ${mathHistory.length} days)</h3>
    ${mathHistory.length > 0 ? '<canvas id="k-math-chart" height="120"></canvas>' : '<p class="text-gray-400 text-sm">No history yet.</p>'}
  </div>
  <div>
    <h3 class="font-bold text-gray-700 mb-2">Reading History (last ${readHistory.length} days)</h3>
    ${readHistory.length > 0 ? '<canvas id="k-read-chart" height="100"></canvas>' : '<p class="text-gray-400 text-sm">No history yet.</p>'}
  </div>
  <script id="k-chart-data" type="application/json">${JSON.stringify({ mathHistory, readHistory })}<\/script>`;
}

export function bindKumonParentEvents() {
  const saveBtn = el('k-save-btn');
  if (!saveBtn) return;

  saveBtn.addEventListener('click', () => {
    const mathL = parseInt(el('k-math-lv')?.value || '3');
    const readL = parseInt(el('k-read-lv')?.value || '3');
    const enabled = el('k-enabled')?.checked !== false;
    const speedMode = el('k-speed')?.checked !== false;
    const state = loadState();
    state.kumon.math.level = mathL;
    state.kumon.reading.level = readL;
    state.kumon.enabled = enabled;
    state.kumon.speedMode = speedMode;
    updateState({ kumon: state.kumon });
    saveBtn.textContent = 'Saved!';
    setTimeout(() => { if (el('k-save-btn')) el('k-save-btn').textContent = 'Save Kumon Settings'; }, 1500);
  });

  const dataEl = el('k-chart-data');
  if (!dataEl || typeof Chart === 'undefined') return;
  const { mathHistory, readHistory } = JSON.parse(dataEl.textContent);

  if (mathHistory.length > 0) {
    const ctx = el('k-math-chart');
    if (ctx) new Chart(ctx, {
      type: 'line',
      data: {
        labels: mathHistory.map(h => h.date.slice(5)),
        datasets: [
          { label: 'Accuracy %', data: mathHistory.map(h => h.accuracy), borderColor: '#F39C12', backgroundColor: 'rgba(243,156,18,0.1)', tension: 0.3, fill: true, yAxisID: 'y' },
          { label: 'Time (s)', data: mathHistory.map(h => h.timeSeconds), borderColor: '#6C63FF', borderDash: [4,2], tension: 0.3, fill: false, yAxisID: 'y2' },
        ],
      },
      options: {
        plugins: { legend: { display: true, labels: { boxWidth: 10, font: { size: 10 } } } },
        scales: { y: { min: 0, max: 100 }, y2: { position: 'right' } },
        responsive: true,
      },
    });
  }

  if (readHistory.length > 0) {
    const ctx = el('k-read-chart');
    if (ctx) new Chart(ctx, {
      type: 'bar',
      data: {
        labels: readHistory.map(h => h.date.slice(5)),
        datasets: [{ label: 'Accuracy %', data: readHistory.map(h => h.accuracy), backgroundColor: 'rgba(108,99,255,0.6)' }],
      },
      options: { plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 100 } }, responsive: true },
    });
  }
}
