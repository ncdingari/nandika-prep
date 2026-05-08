// generators/number-series.js
// Number Series questions for NandikaPrep (Quantitative Battery)

const SERIES_TYPES = [
  // Level 1: +1
  { level: 1, name: "+1", make: (start) => Array.from({ length: 5 }, (_, i) => start + i) },
  // Level 1: -1
  { level: 1, name: "-1", make: (start) => Array.from({ length: 5 }, (_, i) => start - i).filter(n => n > 0) },
  // Level 2: +2
  { level: 2, name: "+2", make: (start) => Array.from({ length: 5 }, (_, i) => start + i * 2) },
  // Level 2: -2
  { level: 2, name: "-2", make: (start) => Array.from({ length: 5 }, (_, i) => start - i * 2).filter(n => n > 0) },
  // Level 3: +3
  { level: 3, name: "+3", make: (start) => Array.from({ length: 5 }, (_, i) => start + i * 3) },
  // Level 3: +5
  { level: 3, name: "+5", make: (start) => Array.from({ length: 5 }, (_, i) => start + i * 5) },
  // Level 4: +4
  { level: 4, name: "+4", make: (start) => Array.from({ length: 5 }, (_, i) => start + i * 4) },
  // Level 4: x2
  { level: 4, name: "x2", make: (start) => Array.from({ length: 5 }, (_, i) => start * Math.pow(2, i)) },
  // Level 5: +10
  { level: 5, name: "+10", make: (start) => Array.from({ length: 5 }, (_, i) => start + i * 10) },
  // Level 5: alternating +2 +3
  { level: 5, name: "+2+3", make: (start) => {
    const arr = [start];
    for (let i = 0; i < 4; i++) arr.push(arr[arr.length - 1] + (i % 2 === 0 ? 2 : 3));
    return arr;
  }},
  // Level 6: alternating +1 +3
  { level: 6, name: "+1+3", make: (start) => {
    const arr = [start];
    for (let i = 0; i < 4; i++) arr.push(arr[arr.length - 1] + (i % 2 === 0 ? 1 : 3));
    return arr;
  }},
  // Level 6: +7
  { level: 6, name: "+7", make: (start) => Array.from({ length: 5 }, (_, i) => start + i * 7) },
  // Level 7: x3
  { level: 7, name: "x3", make: (start) => Array.from({ length: 5 }, (_, i) => start * Math.pow(3, i)) },
  // Level 7: -3
  { level: 7, name: "-3", make: (start) => Array.from({ length: 5 }, (_, i) => start - i * 3).filter(n => n > 0) },
  // Level 8: growing diff (+1,+2,+3,+4)
  { level: 8, name: "grow+1", make: (start) => {
    const arr = [start];
    for (let i = 1; i <= 4; i++) arr.push(arr[arr.length - 1] + i);
    return arr;
  }},
  // Level 8: alternating +5 -2
  { level: 8, name: "+5-2", make: (start) => {
    const arr = [start];
    for (let i = 0; i < 4; i++) arr.push(arr[arr.length - 1] + (i % 2 === 0 ? 5 : -2));
    return arr;
  }},
  // Level 9: x2+1 each step
  { level: 9, name: "x2+1", make: (start) => {
    const arr = [start];
    for (let i = 0; i < 4; i++) arr.push(arr[arr.length - 1] * 2 + 1);
    return arr;
  }},
  // Level 9: squares 1 4 9 16 25
  { level: 9, name: "squares", make: (start) => Array.from({ length: 5 }, (_, i) => (start + i) * (start + i)) },
  // Level 10: fibonacci-like
  { level: 10, name: "fib", make: (start) => {
    const arr = [start, start + 1];
    for (let i = 0; i < 3; i++) arr.push(arr[arr.length - 1] + arr[arr.length - 2]);
    return arr;
  }},
  // Level 10: growing diff (+2,+4,+6,+8)
  { level: 10, name: "grow+2", make: (start) => {
    const arr = [start];
    for (let i = 1; i <= 4; i++) arr.push(arr[arr.length - 1] + i * 2);
    return arr;
  }},
];

function getTypesForLevel(level) {
  const exact = SERIES_TYPES.filter(t => t.level === level);
  if (exact.length >= 1) return exact;
  return SERIES_TYPES.slice().sort((a, b) => Math.abs(a.level - level) - Math.abs(b.level - level));
}

function getStart(level, seed) {
  if (level <= 2) return seed.nextInt(1, 8);
  if (level <= 4) return seed.nextInt(2, 15);
  if (level <= 6) return seed.nextInt(1, 20);
  if (level <= 8) return seed.nextInt(2, 15);
  return seed.nextInt(1, 8);
}

function makePromptSvg(visible, missingIdx) {
  const items = [...visible];
  // Insert ? at the missing position
  const display = [...items];
  // The last element is the ? (missing 5th)
  const all = [...display, "?"];
  const w = 300;
  const cellW = Math.floor(w / all.length) - 4;
  const cells = all.map((v, i) => {
    const x = 8 + i * (cellW + 4);
    const bg = v === "?" ? "#FFF9E6" : "#EEF4FB";
    const border = v === "?" ? "#F0C040" : "#C8D8EC";
    const txt = v === "?" ? "?" : String(v);
    return `<rect x='${x}' y='16' width='${cellW}' height='48' rx='8' fill='${bg}' stroke='${border}' stroke-width='2'/>
<text x='${x + cellW / 2}' y='46' font-size='20' fill='${v === "?" ? "#F0C040" : "#333"}' font-family='Arial' text-anchor='middle' font-weight='bold'>${txt}</text>`;
  }).join("\n  ");
  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 80'>
  <rect width='300' height='80' fill='#FAFAFA' rx='8'/>
  ${cells}
</svg>`;
}

function makeChoiceSvg(num) {
  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 60'>
  <rect width='80' height='60' rx='8' fill='#EEF4FB' stroke='#C8D8EC' stroke-width='2'/>
  <text x='40' y='38' font-size='26' fill='#333' font-family='Arial' text-anchor='middle' font-weight='bold'>${num}</text>
</svg>`;
}

export function generate(level, seed) {
  const pool = getTypesForLevel(level);
  const type = seed.pick(pool);
  const start = getStart(level, seed);

  let series;
  try {
    series = type.make(start);
  } catch {
    series = Array.from({ length: 5 }, (_, i) => start + i);
  }

  // Ensure all values are positive integers and we have at least 5
  if (!series || series.length < 5 || series.some(n => n <= 0 || !Number.isInteger(n))) {
    series = Array.from({ length: 5 }, (_, i) => start + i + 1);
  }

  const correctAnswer = series[4];
  const visible = series.slice(0, 4);

  const wrongs = new Set();
  for (const off of [1, -1, 2, -2, 3]) {
    const w = correctAnswer + off;
    if (w > 0 && w !== correctAnswer) wrongs.add(w);
    if (wrongs.size >= 3) break;
  }
  while (wrongs.size < 3) wrongs.add(correctAnswer + wrongs.size + 4);

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

  const idStr = `ns-L${level}-${String(seed.nextInt(1, 999)).padStart(3, "0")}`;
  const seriesStr = visible.join(", ") + ", ?";

  return {
    id: idStr,
    subtest: "number-series",
    level,
    prompt: `What number comes next? ${seriesStr}`,
    svg: makePromptSvg(visible, 4),
    choices,
    correct: correctId,
    explanation: `Let's look at this one together. The series is ${visible.join(", ")}. The pattern is "${type.name}". So the next number is ${correctAnswer}. Try one more like this tomorrow, you will get it.`,
    skill: `Number series: ${type.name} pattern`,
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
