// generators/number-puzzles.js
// Number Puzzles questions for NandikaPrep (Quantitative Battery)

// Templates by level: each describes an equation with a missing piece
// ___ denotes the missing value (always an integer > 0)

const TEMPLATES = [
  // Level 1-2: simple addition/subtraction within 10
  { level: 1, mkEq: (a, b) => ({ left: `${a} + ${b}`, right: `${a + b}`, ans: a + b, missing: "result", label: `${a} + ${b} = ?` }) },
  { level: 1, mkEq: (a, b) => ({ left: `${a} - ${b}`, right: `${a - b}`, ans: a - b, missing: "result", label: `${a} - ${b} = ?` }) },
  { level: 2, mkEq: (a, b) => ({ left: `? + ${b}`, right: `${a + b}`, ans: a, missing: "left", label: `? + ${b} = ${a + b}` }) },
  { level: 2, mkEq: (a, b) => ({ left: `${a} + ?`, right: `${a + b}`, ans: b, missing: "right", label: `${a} + ? = ${a + b}` }) },
  // Level 3: subtraction unknowns and slightly larger numbers
  { level: 3, mkEq: (a, b) => ({ left: `${a + b} - ?`, right: `${a}`, ans: b, missing: "sub", label: `${a + b} - ? = ${a}` }) },
  { level: 3, mkEq: (a, b) => ({ left: `? - ${b}`, right: `${a}`, ans: a + b, missing: "left", label: `? - ${b} = ${a}` }) },
  // Level 4: within 20
  { level: 4, mkEq: (a, b) => ({ left: `${a} + ${b}`, right: `${a + b}`, ans: a + b, missing: "result", label: `${a} + ${b} = ?` }) },
  { level: 4, mkEq: (a, b) => ({ left: `? + ${b}`, right: `${a + b}`, ans: a, missing: "left", label: `? + ${b} = ${a + b}` }) },
  // Level 5: within 50, introduce multiplication cues
  { level: 5, mkEq: (a, b) => ({ left: `${a} + ${b * 2}`, right: `${a + b * 2}`, ans: a + b * 2, missing: "result", label: `${a} + ${b * 2} = ?` }) },
  { level: 5, mkEq: (a, b) => ({ left: `${a * 2} - ?`, right: `${b}`, ans: a * 2 - b, missing: "sub", label: `${a * 2} - ? = ${b}` }) },
  // Level 6: within 50, mixed
  { level: 6, mkEq: (a, b) => ({ left: `? + ${b}`, right: `${a + b}`, ans: a, missing: "left", label: `? + ${b} = ${a + b}` }) },
  { level: 6, mkEq: (a, b) => ({ left: `${a} x ${b}`, right: `${a * b}`, ans: a * b, missing: "result", label: `${a} x ${b} = ?` }) },
  // Level 7: two-step equations within 50
  { level: 7, mkEq: (a, b) => ({ left: `(${a} + ${b}) + ${a}`, right: `${a + b + a}`, ans: a + b + a, missing: "result", label: `(${a} + ${b}) + ${a} = ?` }) },
  { level: 7, mkEq: (a, b) => ({ left: `${a} x ${b} + ${b}`, right: `${a * b + b}`, ans: a * b + b, missing: "result", label: `${a} x ${b} + ${b} = ?` }) },
  // Level 8: within 100
  { level: 8, mkEq: (a, b) => ({ left: `${a * 5} + ${b}`, right: `${a * 5 + b}`, ans: a * 5 + b, missing: "result", label: `${a * 5} + ${b} = ?` }) },
  { level: 8, mkEq: (a, b) => ({ left: `? x ${b}`, right: `${a * b}`, ans: a, missing: "left", label: `? x ${b} = ${a * b}` }) },
  // Level 9: two-step with unknown
  { level: 9, mkEq: (a, b) => ({ left: `(? + ${b}) x 2`, right: `${(a + b) * 2}`, ans: a, missing: "inner", label: `(? + ${b}) x 2 = ${(a + b) * 2}` }) },
  { level: 9, mkEq: (a, b) => ({ left: `${a} x ? + ${b}`, right: `${a * 3 + b}`, ans: 3, missing: "factor", label: `${a} x ? + ${b} = ${a * 3 + b}` }) },
  // Level 10: multi-step
  { level: 10, mkEq: (a, b) => ({ left: `(${a} + ?) x ${b}`, right: `${(a + b) * b}`, ans: b, missing: "inner", label: `(${a} + ?) x ${b} = ${(a + b) * b}` }) },
  { level: 10, mkEq: (a, b) => ({ left: `? x ${b} - ${a}`, right: `${3 * b - a}`, ans: 3, missing: "factor", label: `? x ${b} - ${a} = ${3 * b - a}` }) },
];

function getTemplatesForLevel(level) {
  const exact = TEMPLATES.filter(t => t.level === level);
  if (exact.length >= 1) return exact;
  return TEMPLATES.slice().sort((a, b) => Math.abs(a.level - level) - Math.abs(b.level - level));
}

function getRange(level) {
  if (level <= 2) return [1, 5];
  if (level <= 4) return [2, 8];
  if (level <= 6) return [2, 10];
  if (level <= 8) return [3, 12];
  return [4, 10];
}

function makePromptSvg(label) {
  const maxChars = 28;
  const lines = [];
  let remaining = label;
  while (remaining.length > maxChars) {
    const idx = remaining.lastIndexOf(" ", maxChars);
    lines.push(remaining.substring(0, idx < 0 ? maxChars : idx));
    remaining = remaining.substring(idx < 0 ? maxChars : idx + 1);
  }
  lines.push(remaining);
  const h = 50 + lines.length * 34;
  const textLines = lines.map((l, i) =>
    `<text x='150' y='${42 + i * 34}' font-size='24' fill='#333' font-family='Arial' text-anchor='middle' font-weight='bold'>${l}</text>`
  ).join("\n  ");
  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 ${h}'>
  <rect width='300' height='${h}' fill='#EEF4FB' rx='10' stroke='#C8D8EC' stroke-width='2'/>
  <text x='150' y='24' font-size='13' fill='#666' font-family='Arial' text-anchor='middle'>Find the missing number:</text>
  ${textLines}
</svg>`;
}

function makeChoiceSvg(num) {
  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 60'>
  <rect width='80' height='60' rx='8' fill='#EEF4FB' stroke='#C8D8EC' stroke-width='2'/>
  <text x='40' y='38' font-size='26' fill='#333' font-family='Arial' text-anchor='middle' font-weight='bold'>${num}</text>
</svg>`;
}

export function generate(level, seed) {
  const pool = getTemplatesForLevel(level);
  const tmpl = seed.pick(pool);
  const [rMin, rMax] = getRange(level);
  const a = seed.nextInt(rMin, rMax);
  const b = seed.nextInt(rMin, rMax);

  let eq;
  try {
    eq = tmpl.mkEq(a, b);
  } catch {
    eq = { label: `${a} + ${b} = ?`, ans: a + b };
  }

  if (eq.ans <= 0 || !Number.isInteger(eq.ans)) {
    eq = { label: `${a} + ${b} = ?`, ans: a + b };
  }

  const correctAnswer = eq.ans;
  const wrongs = new Set();
  for (const off of [1, -1, 2, -2, 3, 4]) {
    const w = correctAnswer + off;
    if (w > 0 && w !== correctAnswer) wrongs.add(w);
    if (wrongs.size >= 3) break;
  }
  while (wrongs.size < 3) wrongs.add(correctAnswer + wrongs.size + 5);

  const wrongArr = Array.from(wrongs).slice(0, 3);
  const allChoices = [
    { letter: "A", val: correctAnswer, _correct: true },
    { letter: "B", val: wrongArr[0], _correct: false },
    { letter: "C", val: wrongArr[1], _correct: false },
    { letter: "D", val: wrongArr[2], _correct: false },
  ];

  const shuffled = seed.shuffle(allChoices);
  const correctId = shuffled.find(c => c._correct).letter;
  const choices = shuffled.map(c => ({ id: c.letter, label: c.letter, svg: makeChoiceSvg(c.val) }));

  const idStr = `np-L${level}-${String(seed.nextInt(1, 999)).padStart(3, "0")}`;

  return {
    id: idStr,
    subtest: "number-puzzles",
    level,
    prompt: `Find the missing number: ${eq.label}`,
    svg: makePromptSvg(eq.label),
    choices,
    correct: correctId,
    explanation: `Let's look at this one together. The equation is ${eq.label}. We need to find what makes it balance. The answer is ${correctAnswer}. Try one more like this tomorrow, you will get it.`,
    skill: "Number equations and missing values",
  };
}

export function smokeTest(mockSeed) {
  const s = mockSeed || { next: () => 0.5, nextInt: (a, b) => Math.floor((a + b) / 2), pick: arr => arr[0], shuffle: arr => [...arr] };
  return generate(3, s);
}

if (typeof process !== "undefined" && process.argv[1] && process.argv[1].includes("generators/")) {
  const mockSeed = { next: () => 0.5, nextInt: (a, b) => Math.floor((a + b) / 2), pick: arr => arr[0], shuffle: arr => [...arr] };
  console.log(JSON.stringify(smokeTest(mockSeed), null, 2));
}
