// generators/paper-folding.js
// Paper Folding questions for NandikaPrep (Nonverbal Battery)

// Each template defines a fold sequence and a hole position, then the correct unfolded result

// Paper is a 100x100 unit square. Folds are described as axis lines.
// Hole is punched at (hx, hy) on the folded paper.
// We compute where the hole appears on the unfolded paper.

const FOLD_TEMPLATES = [
  // Level 1: single horizontal fold (bottom half folds up)
  { level: 1, name: "fold-bottom-up",
    folds: [{ axis: "h", at: 50 }], hole: { x: 50, y: 25 },
    correctHoles: [{ x: 50, y: 25 }, { x: 50, y: 75 }],
    description: "The paper is folded in half from bottom to top. A hole is punched through both layers." },
  // Level 1: single vertical fold (right half folds left)
  { level: 1, name: "fold-right-left",
    folds: [{ axis: "v", at: 50 }], hole: { x: 25, y: 50 },
    correctHoles: [{ x: 25, y: 50 }, { x: 75, y: 50 }],
    description: "The paper is folded in half from right to left. A hole is punched through both layers." },
  // Level 2: fold from top down
  { level: 2, name: "fold-top-down",
    folds: [{ axis: "h", at: 50 }], hole: { x: 30, y: 25 },
    correctHoles: [{ x: 30, y: 25 }, { x: 30, y: 75 }],
    description: "The paper is folded in half from top to bottom. A hole is punched near the left side." },
  { level: 2, name: "fold-left-right",
    folds: [{ axis: "v", at: 50 }], hole: { x: 25, y: 30 },
    correctHoles: [{ x: 25, y: 30 }, { x: 75, y: 30 }],
    description: "The paper is folded in half from left to right. A hole is punched through both layers." },
  // Level 3: two folds
  { level: 3, name: "two-fold-hv",
    folds: [{ axis: "h", at: 50 }, { axis: "v", at: 50 }], hole: { x: 25, y: 25 },
    correctHoles: [{ x: 25, y: 25 }, { x: 75, y: 25 }, { x: 25, y: 75 }, { x: 75, y: 75 }],
    description: "The paper is folded in half horizontally, then vertically. A hole is punched in the corner." },
  { level: 3, name: "two-fold-vh",
    folds: [{ axis: "v", at: 50 }, { axis: "h", at: 50 }], hole: { x: 25, y: 25 },
    correctHoles: [{ x: 25, y: 25 }, { x: 75, y: 25 }, { x: 25, y: 75 }, { x: 75, y: 75 }],
    description: "The paper is folded vertically then horizontally. A hole is punched in the corner." },
  // Level 4: fold with hole near edge
  { level: 4, name: "fold-h-edge-hole",
    folds: [{ axis: "h", at: 50 }], hole: { x: 20, y: 20 },
    correctHoles: [{ x: 20, y: 20 }, { x: 20, y: 80 }],
    description: "Fold in half horizontally. Hole punched near upper-left." },
  { level: 4, name: "fold-v-edge-hole",
    folds: [{ axis: "v", at: 50 }], hole: { x: 20, y: 70 },
    correctHoles: [{ x: 20, y: 70 }, { x: 80, y: 70 }],
    description: "Fold in half vertically. Hole punched near lower-left." },
  // Level 5: diagonal fold (simplified)
  { level: 5, name: "two-fold-center",
    folds: [{ axis: "h", at: 50 }, { axis: "v", at: 50 }], hole: { x: 30, y: 30 },
    correctHoles: [{ x: 30, y: 30 }, { x: 70, y: 30 }, { x: 30, y: 70 }, { x: 70, y: 70 }],
    description: "Two folds. Hole punched at a point that mirrors 4 times." },
  // Level 6-7: three holes in result
  { level: 6, name: "fold-h-two-holes",
    folds: [{ axis: "h", at: 50 }], hole: { x: 50, y: 20 },
    correctHoles: [{ x: 50, y: 20 }, { x: 50, y: 80 }],
    description: "Fold horizontally. Hole in center-top position." },
  { level: 7, name: "fold-diag-approx",
    folds: [{ axis: "v", at: 50 }], hole: { x: 30, y: 40 },
    correctHoles: [{ x: 30, y: 40 }, { x: 70, y: 40 }],
    description: "Fold vertically. Hole on left side creates mirror on right." },
  // Level 8-9: complex result
  { level: 8, name: "three-fold",
    folds: [{ axis: "h", at: 50 }, { axis: "v", at: 50 }], hole: { x: 20, y: 20 },
    correctHoles: [{ x: 20, y: 20 }, { x: 80, y: 20 }, { x: 20, y: 80 }, { x: 80, y: 80 }],
    description: "Two perpendicular folds. Corner hole creates 4 holes when unfolded." },
  { level: 9, name: "three-fold-offset",
    folds: [{ axis: "h", at: 50 }, { axis: "v", at: 50 }], hole: { x: 35, y: 20 },
    correctHoles: [{ x: 35, y: 20 }, { x: 65, y: 20 }, { x: 35, y: 80 }, { x: 65, y: 80 }],
    description: "Two folds, off-center hole creates 4 holes." },
  // Level 10
  { level: 10, name: "quad-fold",
    folds: [{ axis: "h", at: 50 }, { axis: "v", at: 50 }], hole: { x: 25, y: 35 },
    correctHoles: [{ x: 25, y: 35 }, { x: 75, y: 35 }, { x: 25, y: 65 }, { x: 75, y: 65 }],
    description: "Four-quadrant fold produces 4 symmetric holes when unfolded." },
];

function getTemplatesForLevel(level) {
  const exact = FOLD_TEMPLATES.filter(t => t.level === level);
  if (exact.length >= 1) return exact;
  return FOLD_TEMPLATES.slice().sort((a, b) => Math.abs(a.level - level) - Math.abs(b.level - level));
}

// Draw a square paper with holes marked as filled circles
function makePaperSvg(holes, isCorrect, isQuestion) {
  const size = 100;
  const bg = isQuestion ? "#FFF9E6" : (isCorrect ? "#E8F5E9" : "#FAFAFA");
  const border = isQuestion ? "#F0C040" : "#C8D8EC";
  let holesSvg = holes.map(h =>
    `<circle cx='${h.x}' cy='${h.y}' r='6' fill='#333'/>`
  ).join("\n  ");
  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>
  <rect width='100' height='100' fill='${bg}' stroke='${border}' stroke-width='2'/>
  ${holesSvg}
</svg>`;
}

// Draw the fold sequence (folds shown as dashed lines, hole shown as open circle)
function makePromptSvg(tmpl) {
  const foldLines = tmpl.folds.map(f => {
    if (f.axis === "h") {
      return `<line x1='5' y1='${f.at}' x2='95' y2='${f.at}' stroke='#4A90D9' stroke-width='2' stroke-dasharray='5,3'/>
    <text x='97' y='${f.at + 4}' font-size='8' fill='#4A90D9' font-family='Arial'>fold</text>`;
    } else {
      return `<line x1='${f.at}' y1='5' x2='${f.at}' y2='95' stroke='#4A90D9' stroke-width='2' stroke-dasharray='5,3'/>
    <text x='${f.at - 10}' y='8' font-size='8' fill='#4A90D9' font-family='Arial'>fold</text>`;
    }
  }).join("\n  ");

  const holeCircle = `<circle cx='${tmpl.hole.x}' cy='${tmpl.hole.y}' r='5' fill='none' stroke='#E74C3C' stroke-width='2'/>
  <text x='${tmpl.hole.x + 8}' y='${tmpl.hole.y + 4}' font-size='8' fill='#E74C3C' font-family='Arial'>punch</text>`;

  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 130'>
  <rect width='200' height='130' fill='#FAFAFA' rx='8'/>
  <text x='100' y='14' font-size='11' fill='#666' font-family='Arial' text-anchor='middle'>Fold the paper, then punch a hole.</text>
  <g transform='translate(50 20)'>
    <rect width='100' height='100' fill='#EEF4FB' stroke='#C8D8EC' stroke-width='2' rx='2'/>
    ${foldLines}
    ${holeCircle}
  </g>
  <text x='100' y='125' font-size='10' fill='#888' font-family='Arial' text-anchor='middle'>Which picture shows the unfolded paper?</text>
</svg>`;
}

function makeChoiceSvg(holes) {
  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'>
  <rect width='80' height='80' fill='#EEF4FB' stroke='#C8D8EC' stroke-width='2' rx='4'/>
  ${holes.map(h => `<circle cx='${h.x * 0.8}' cy='${h.y * 0.8}' r='5' fill='#333'/>`).join("\n  ")}
</svg>`;
}

// Generate wrong hole positions by offsetting
function makeWrongHoles(correctHoles, offset) {
  return correctHoles.map(h => ({
    x: Math.max(10, Math.min(90, h.x + offset)),
    y: Math.max(10, Math.min(90, h.y + offset)),
  }));
}

export function generate(level, seed) {
  const pool = getTemplatesForLevel(level);
  const tmpl = seed.pick(pool);

  const correctHoles = tmpl.correctHoles;

  const wrongs = [
    makeWrongHoles(correctHoles, 15),
    makeWrongHoles(correctHoles, -15),
    [{ x: 50, y: 50 }], // wrong: single center hole
  ];

  const allChoices = [
    { letter: "A", holes: correctHoles, _correct: true },
    { letter: "B", holes: wrongs[0], _correct: false },
    { letter: "C", holes: wrongs[1], _correct: false },
    { letter: "D", holes: wrongs[2], _correct: false },
  ];

  const shuffled = seed.shuffle(allChoices);
  const correctId = shuffled.find(c => c._correct).letter;
  const choices = shuffled.map(c => ({ id: c.letter, label: c.letter, svg: makeChoiceSvg(c.holes) }));

  const idStr = `pf-L${level}-${String(seed.nextInt(1, 999)).padStart(3, "0")}`;

  return {
    id: idStr,
    subtest: "paper-folding",
    level,
    prompt: "Fold the paper as shown, then punch a hole. Which picture shows the unfolded paper?",
    svg: makePromptSvg(tmpl),
    choices,
    correct: correctId,
    explanation: `Let's look at this one together. ${tmpl.description} When you unfold the paper, the hole appears in ${correctHoles.length} place${correctHoles.length > 1 ? "s" : ""} because both layers were punched. Try one more like this tomorrow, you will get it.`,
    skill: `Paper folding: ${tmpl.name}`,
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
