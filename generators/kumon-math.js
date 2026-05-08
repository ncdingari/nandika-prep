// generators/kumon-math.js
// Kumon Math drill generator for NandikaPrep
// Valid ES module -- no build step required

const LEVEL_CONFIG = [
  null, // index 0 unused
  { count: 40, sct: 300 },  // L1
  { count: 40, sct: 300 },  // L2
  { count: 50, sct: 360 },  // L3
  { count: 50, sct: 360 },  // L4
  { count: 50, sct: 420 },  // L5
  { count: 50, sct: 360 },  // L6
  { count: 50, sct: 360 },  // L7
  { count: 50, sct: 420 },  // L8
  { count: 50, sct: 480 },  // L9
  { count: 40, sct: 480 },  // L10
  { count: 40, sct: 540 },  // L11
  { count: 40, sct: 600 },  // L12
];

// ---------------------------------------------------------------------------
// Pre-computed valid operand pairs (avoids infinite loops with seeded RNG)
// ---------------------------------------------------------------------------

// L3: addition within 10 -- all pairs where a+b <= 10
const L3_PAIRS = [];
for (let a = 0; a <= 10; a++) for (let b = 0; b <= 10 - a; b++) L3_PAIRS.push([a, b]);

// L4: addition within 20, NO carry -- tens+ones >= 10 AND ones don't overflow
// a is 10-19, b is 0-9, ones(a)+ones(b) <= 9
const L4_PAIRS = [];
for (let a = 10; a <= 19; a++) for (let b = 0; b <= 9; b++) {
  if ((a % 10) + (b % 10) <= 9 && a + b <= 20) L4_PAIRS.push([a, b]);
}

// L5: addition within 20, WITH carry -- ones sum >= 10, total <= 20
const L5_PAIRS = [];
for (let a = 1; a <= 19; a++) for (let b = 1; b <= 19; b++) {
  if ((a % 10) + (b % 10) >= 10 && a + b <= 20 && a + b > 10) L5_PAIRS.push([a, b]);
}

// L6: subtraction within 10, no negative answer
const L6_PAIRS = [];
for (let a = 0; a <= 10; a++) for (let b = 0; b <= a; b++) L6_PAIRS.push([a, b]);

// L7: subtraction within 20, NO borrow -- ones(a) >= ones(b), a >= b
const L7_PAIRS = [];
for (let a = 10; a <= 20; a++) for (let b = 0; b <= 9; b++) {
  if (b <= a && (a % 10) >= (b % 10)) L7_PAIRS.push([a, b]);
}

// L8: subtraction within 20, WITH borrow -- ones(a) < ones(b), a > b
const L8_PAIRS = [];
for (let a = 11; a <= 20; a++) for (let b = 2; b < a; b++) {
  if ((a % 10) < (b % 10) && a - b >= 1) L8_PAIRS.push([a, b]);
}

// L9: mix of L3 add and L8 subtract (varied)
const L9_ADD = L3_PAIRS.filter(([a, b]) => a + b <= 20 && a + b >= 1);
const L9_SUB = L6_PAIRS.filter(([a, b]) => a >= 1);

// L10: 2-digit add, no carry -- ones(a)+ones(b) <= 9, sum <= 99
const L10_PAIRS = [];
for (let a = 10; a <= 80; a++) for (let b = 10; b <= 80; b++) {
  if ((a % 10) + (b % 10) <= 9 && a + b <= 99) L10_PAIRS.push([a, b]);
}

// L11: 2-digit add, WITH carry -- ones(a)+ones(b) >= 10, sum <= 99
const L11_PAIRS = [];
for (let a = 10; a <= 89; a++) for (let b = 10; b <= 89; b++) {
  if ((a % 10) + (b % 10) >= 10 && a + b <= 99) L11_PAIRS.push([a, b]);
}

// L12: 2-digit subtract WITH borrow -- ones(a) < ones(b), a > b
const L12_PAIRS = [];
for (let a = 21; a <= 99; a++) for (let b = 10; b < a; b++) {
  if ((a % 10) < (b % 10)) L12_PAIRS.push([a, b]);
}

// ---------------------------------------------------------------------------
// Helper: pick index cycling through a pool
// ---------------------------------------------------------------------------
function pickFromPool(pool, seed, idx) {
  // Use seed to select a starting offset, then cycle
  const offset = seed.nextInt(0, pool.length - 1);
  return pool[(offset + idx) % pool.length];
}

// ---------------------------------------------------------------------------
// Level generators
// ---------------------------------------------------------------------------

function genL1(seed, count) {
  const questions = [];
  for (let i = 0; i < count; i++) {
    const n = seed.nextInt(1, 20);
    const variant = i % 4;
    let prompt, correct;
    if (variant === 0) {
      prompt = `What number is ${n}?`;
      correct = n;
    } else if (variant === 1) {
      const start = Math.max(1, n - 3);
      const seq = [];
      for (let k = start; k < n; k++) seq.push(k);
      if (seq.length === 0) seq.push(n - 1 < 1 ? 1 : n - 1);
      prompt = `Count: ${seq.join(', ')}, ___`;
      correct = n;
    } else if (variant === 2) {
      const prev = Math.max(1, n - 1);
      prompt = `What comes after ${prev}?`;
      correct = prev + 1;
    } else {
      const start2 = Math.max(1, n - 2);
      const seq2 = [start2, start2 + 1];
      const ans = start2 + 2 <= 20 ? start2 + 2 : 20;
      prompt = `Count on: ${seq2.join(', ')}, ___`;
      correct = ans;
    }
    questions.push({ id: `km-L1-${String(i + 1).padStart(3, '0')}`, prompt, correct });
  }
  return questions;
}

function genL2(seed, count) {
  const questions = [];
  for (let i = 0; i < count; i++) {
    const n = seed.nextInt(4, 16);
    const pos = i % 3;
    let prompt, correct;
    if (pos === 0) {
      prompt = `___, ${n + 1}, ${n + 2}, ${n + 3}`;
      correct = n;
    } else if (pos === 1) {
      prompt = `${n - 1}, ___, ${n + 1}, ${n + 2}`;
      correct = n;
    } else {
      prompt = `${n - 2}, ${n - 1}, ${n}, ___`;
      correct = n + 1;
    }
    questions.push({ id: `km-L2-${String(i + 1).padStart(3, '0')}`, prompt, correct });
  }
  return questions;
}

function genL3(seed, count) {
  const questions = [];
  for (let i = 0; i < count; i++) {
    const [a, b] = pickFromPool(L3_PAIRS, seed, i);
    const prompt = `${a} + ${b}`;
    questions.push({ id: `km-L3-${String(i + 1).padStart(3, '0')}`, prompt, correct: a + b });
  }
  return questions;
}

function genL4(seed, count) {
  const questions = [];
  for (let i = 0; i < count; i++) {
    const [a, b] = pickFromPool(L4_PAIRS, seed, i);
    const prompt = `${a} + ${b}`;
    questions.push({ id: `km-L4-${String(i + 1).padStart(3, '0')}`, prompt, correct: a + b });
  }
  return questions;
}

function genL5(seed, count) {
  const questions = [];
  for (let i = 0; i < count; i++) {
    const [a, b] = pickFromPool(L5_PAIRS, seed, i);
    const prompt = `${a} + ${b}`;
    questions.push({ id: `km-L5-${String(i + 1).padStart(3, '0')}`, prompt, correct: a + b });
  }
  return questions;
}

function genL6(seed, count) {
  const questions = [];
  for (let i = 0; i < count; i++) {
    const [a, b] = pickFromPool(L6_PAIRS, seed, i);
    const prompt = `${a} - ${b}`;
    questions.push({ id: `km-L6-${String(i + 1).padStart(3, '0')}`, prompt, correct: a - b });
  }
  return questions;
}

function genL7(seed, count) {
  const questions = [];
  for (let i = 0; i < count; i++) {
    const [a, b] = pickFromPool(L7_PAIRS, seed, i);
    const prompt = `${a} - ${b}`;
    questions.push({ id: `km-L7-${String(i + 1).padStart(3, '0')}`, prompt, correct: a - b });
  }
  return questions;
}

function genL8(seed, count) {
  const questions = [];
  for (let i = 0; i < count; i++) {
    const [a, b] = pickFromPool(L8_PAIRS, seed, i);
    const prompt = `${a} - ${b}`;
    questions.push({ id: `km-L8-${String(i + 1).padStart(3, '0')}`, prompt, correct: a - b });
  }
  return questions;
}

function genL9(seed, count) {
  const questions = [];
  for (let i = 0; i < count; i++) {
    const useAdd = (i % 2) === 0;
    let prompt, correct;
    if (useAdd) {
      const [a, b] = pickFromPool(L9_ADD, seed, i);
      prompt = `${a} + ${b}`;
      correct = a + b;
    } else {
      const [a, b] = pickFromPool(L9_SUB, seed, i);
      prompt = `${a} - ${b}`;
      correct = a - b;
    }
    questions.push({ id: `km-L9-${String(i + 1).padStart(3, '0')}`, prompt, correct });
  }
  return questions;
}

function genL10(seed, count) {
  const questions = [];
  const TEMPLATES = ['add', 'tens', 'ones', 'add'];
  for (let i = 0; i < count; i++) {
    const [a, b] = pickFromPool(L10_PAIRS, seed, i);
    const tpl = TEMPLATES[i % TEMPLATES.length];
    let prompt, correct;
    if (tpl === 'tens') {
      correct = Math.floor((a + b) / 10);
      prompt = `How many tens in ${a + b}?`;
    } else if (tpl === 'ones') {
      correct = a % 10;
      prompt = `How many ones in ${a}?`;
    } else {
      prompt = `${a} + ${b}`;
      correct = a + b;
    }
    questions.push({ id: `km-L10-${String(i + 1).padStart(3, '0')}`, prompt, correct });
  }
  return questions;
}

function genL11(seed, count) {
  const questions = [];
  for (let i = 0; i < count; i++) {
    const [a, b] = pickFromPool(L11_PAIRS, seed, i);
    const prompt = `${a} + ${b}`;
    questions.push({ id: `km-L11-${String(i + 1).padStart(3, '0')}`, prompt, correct: a + b });
  }
  return questions;
}

function genL12(seed, count) {
  const questions = [];
  for (let i = 0; i < count; i++) {
    const [a, b] = pickFromPool(L12_PAIRS, seed, i);
    const prompt = `${a} - ${b}`;
    questions.push({ id: `km-L12-${String(i + 1).padStart(3, '0')}`, prompt, correct: a - b });
  }
  return questions;
}

const GENERATORS = [
  null,
  genL1, genL2, genL3, genL4, genL5, genL6,
  genL7, genL8, genL9, genL10, genL11, genL12,
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function generate(level, seed) {
  if (level < 1 || level > 12) throw new Error(`Level must be 1-12, got ${level}`);
  const cfg = LEVEL_CONFIG[level];
  const genFn = GENERATORS[level];
  const questions = genFn(seed, cfg.count);
  return {
    level,
    sct_seconds: cfg.sct,
    questions,
  };
}

export function smokeTest(mockSeed) {
  const seed = mockSeed || {
    next: () => Math.random(),
    nextInt: (a, b) => Math.floor(Math.random() * (b - a + 1)) + a,
    pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
    shuffle: (arr) => [...arr].sort(() => Math.random() - 0.5),
  };
  for (let lvl = 1; lvl <= 12; lvl++) {
    const result = generate(lvl, seed);
    const cfg = LEVEL_CONFIG[lvl];
    if (result.questions.length !== cfg.count) {
      throw new Error(`L${lvl}: expected ${cfg.count} questions, got ${result.questions.length}`);
    }
    if (result.sct_seconds !== cfg.sct) {
      throw new Error(`L${lvl}: wrong SCT`);
    }
    for (const q of result.questions) {
      if (typeof q.correct !== 'number') throw new Error(`L${lvl}: correct must be number`);
      if (q.correct < 0) throw new Error(`L${lvl}: negative answer in "${q.prompt}" = ${q.correct}`);
    }
  }
  return generate(5, seed);
}

if (typeof process !== 'undefined' && process.argv[1] && process.argv[1].endsWith('kumon-math.js')) {
  const mockSeed = { next: () => 0.42, nextInt: (a,b) => Math.floor((b-a+1)*0.42)+a, pick: (arr) => arr[Math.floor(arr.length*0.42)], shuffle: (arr) => [...arr] };
  const result = smokeTest(mockSeed);
  console.log(`Level ${result.level}, SCT ${result.sct_seconds}s, ${result.questions.length} questions`);
  console.log('Sample:', JSON.stringify(result.questions.slice(0,3)));
}
