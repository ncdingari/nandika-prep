// generators/number-analogies.js
// Number Analogies questions for NandikaPrep (Quantitative Battery)

// Level map: each level has a set of rules (operations) with number ranges
const LEVEL_CONFIG = [
  { level: 1, ops: [{ name: "+1", fn: n => n + 1 }], range: [1, 9] },
  { level: 1, ops: [{ name: "-1", fn: n => n - 1 }], range: [2, 10] },
  { level: 2, ops: [{ name: "+2", fn: n => n + 2 }], range: [1, 8] },
  { level: 2, ops: [{ name: "+1", fn: n => n + 1 }, { name: "-1", fn: n => n - 1 }], range: [1, 9] },
  { level: 3, ops: [{ name: "+3", fn: n => n + 3 }], range: [1, 7] },
  { level: 3, ops: [{ name: "x2", fn: n => n * 2 }], range: [1, 5] },
  { level: 4, ops: [{ name: "+5", fn: n => n + 5 }], range: [1, 10] },
  { level: 4, ops: [{ name: "x2", fn: n => n * 2 }], range: [2, 6] },
  { level: 5, ops: [{ name: "+10", fn: n => n + 10 }], range: [1, 20] },
  { level: 5, ops: [{ name: "x3", fn: n => n * 3 }], range: [1, 5] },
  { level: 6, ops: [{ name: "-2", fn: n => n - 2 }], range: [3, 12] },
  { level: 6, ops: [{ name: "x2", fn: n => n * 2 }], range: [5, 10] },
  { level: 7, ops: [{ name: "+7", fn: n => n + 7 }], range: [3, 13] },
  { level: 7, ops: [{ name: "div2", fn: n => n / 2 }], range: [2, 10] },
  { level: 8, ops: [{ name: "x4", fn: n => n * 4 }], range: [1, 6] },
  { level: 8, ops: [{ name: "+9", fn: n => n + 9 }], range: [1, 11] },
  { level: 9, ops: [{ name: "sq", fn: n => n * n }], range: [2, 5] },
  { level: 9, ops: [{ name: "-5", fn: n => n - 5 }], range: [6, 15] },
  { level: 10, ops: [{ name: "x5", fn: n => n * 5 }], range: [2, 8] },
  { level: 10, ops: [{ name: "sq+1", fn: n => n * n + 1 }], range: [2, 5] },
];

function getConfigsForLevel(level) {
  const exact = LEVEL_CONFIG.filter(c => c.level === level);
  if (exact.length >= 1) return exact;
  return LEVEL_CONFIG.slice().sort((a, b) => Math.abs(a.level - level) - Math.abs(b.level - level));
}

function makeNumberCellSvg(a, b, isQuestion) {
  const bg = isQuestion ? "#FFF9E6" : "#EEF4FB";
  const border = isQuestion ? "#F0C040" : "#C8D8EC";
  return `<g>
  <rect x='2' y='2' width='56' height='36' rx='6' fill='${bg}' stroke='${border}' stroke-width='1.5'/>
  <text x='30' y='25' font-size='18' fill='#333' font-family='Arial' text-anchor='middle' font-weight='bold'>${isQuestion ? "?" : a + " → " + b}</text>
</g>`;
}

function makePromptSvg(a, b, c) {
  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 80'>
  <rect width='300' height='80' fill='#FAFAFA' rx='8'/>
  <rect x='8' y='12' width='88' height='56' rx='8' fill='#EEF4FB' stroke='#C8D8EC' stroke-width='1.5'/>
  <text x='52' y='38' font-size='17' fill='#333' font-family='Arial' text-anchor='middle' font-weight='bold'>${a}</text>
  <text x='52' y='58' font-size='13' fill='#666' font-family='Arial' text-anchor='middle'>gives</text>
  <text x='52' y='73' font-size='17' fill='#4A90D9' font-family='Arial' text-anchor='middle' font-weight='bold'>${b}</text>
  <text x='108' y='44' font-size='22' fill='#888' font-family='Arial' text-anchor='middle'>:</text>
  <rect x='122' y='12' width='88' height='56' rx='8' fill='#EEF4FB' stroke='#C8D8EC' stroke-width='1.5'/>
  <text x='166' y='38' font-size='17' fill='#333' font-family='Arial' text-anchor='middle' font-weight='bold'>${c}</text>
  <text x='166' y='58' font-size='13' fill='#666' font-family='Arial' text-anchor='middle'>gives</text>
  <text x='166' y='73' font-size='17' fill='#F0C040' font-family='Arial' text-anchor='middle' font-weight='bold'>?</text>
  <text x='220' y='44' font-size='14' fill='#888' font-family='Arial' text-anchor='middle'>:</text>
  <text x='258' y='44' font-size='22' fill='#F0C040' font-family='Arial' text-anchor='middle' font-weight='bold'>?</text>
</svg>`;
}

function makeChoiceSvg(num) {
  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 60'>
  <rect width='80' height='60' rx='8' fill='#EEF4FB' stroke='#C8D8EC' stroke-width='2'/>
  <text x='40' y='38' font-size='26' fill='#333' font-family='Arial' text-anchor='middle' font-weight='bold'>${num}</text>
</svg>`;
}

export function generate(level, seed) {
  const configs = getConfigsForLevel(level);
  const cfg = seed.pick(configs);
  const op = seed.pick(cfg.ops);
  const [min, max] = cfg.range;

  const a = seed.nextInt(min, max);
  const b = op.fn(a);
  const c = seed.nextInt(min, max);
  const correctAnswer = op.fn(c);

  // Ensure b and correctAnswer are positive integers
  if (b <= 0 || correctAnswer <= 0 || !Number.isInteger(b) || !Number.isInteger(correctAnswer)) {
    // Fallback safe values
    return generate(Math.max(1, level - 1), seed);
  }

  // Generate 3 wrong answers (different from correct)
  const wrongs = new Set();
  const offsets = [1, -1, 2, -2, 3, 5];
  for (const off of offsets) {
    const w = correctAnswer + off;
    if (w > 0 && w !== correctAnswer) wrongs.add(w);
    if (wrongs.size >= 3) break;
  }
  while (wrongs.size < 3) {
    const w = seed.nextInt(1, correctAnswer + 5);
    if (w !== correctAnswer) wrongs.add(w);
  }
  const wrongArr = Array.from(wrongs).slice(0, 3);

  const allChoices = [
    { letter: "A", val: correctAnswer, _correct: true },
    { letter: "B", val: wrongArr[0], _correct: false },
    { letter: "C", val: wrongArr[1], _correct: false },
    { letter: "D", val: wrongArr[2], _correct: false },
  ];

  const shuffled = seed.shuffle(allChoices);
  const correctId = shuffled.find(c => c._correct).letter;

  const choices = shuffled.map(c => ({
    id: c.letter,
    label: c.letter,
    svg: makeChoiceSvg(c.val),
  }));

  const idStr = `na-L${level}-${String(seed.nextInt(1, 999)).padStart(3, "0")}`;
  const promptSvg = makePromptSvg(a, b, c);

  const ruleDesc = (() => {
    switch (op.name) {
      case "+1": return "adds 1";
      case "-1": return "subtracts 1";
      case "+2": return "adds 2";
      case "+3": return "adds 3";
      case "+5": return "adds 5";
      case "+7": return "adds 7";
      case "+9": return "adds 9";
      case "+10": return "adds 10";
      case "-2": return "subtracts 2";
      case "-5": return "subtracts 5";
      case "x2": return "doubles the number";
      case "x3": return "multiplies by 3";
      case "x4": return "multiplies by 4";
      case "x5": return "multiplies by 5";
      case "div2": return "divides by 2";
      case "sq": return "multiplies the number by itself";
      case "sq+1": return "multiplies by itself and adds 1";
      default: return "applies a rule";
    }
  })();

  return {
    id: idStr,
    subtest: "number-analogies",
    level,
    prompt: `If ${a} gives ${b}, then ${c} gives what number?`,
    svg: promptSvg,
    choices,
    correct: correctId,
    explanation: `Let's look at this one together. The rule is: ${a} ${ruleDesc} to get ${b}. So we do the same to ${c} and get ${correctAnswer}. Try one more like this tomorrow, you will get it.`,
    skill: `Number rule: ${op.name}`,
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
