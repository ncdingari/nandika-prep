// generators/figure-matrices.js
// Figure Matrices questions for NandikaPrep (Nonverbal Battery)

const SHAPES = ["circle", "square", "triangle", "diamond", "star"];
const COLORS = { blue: "#4A90D9", red: "#E74C3C", green: "#2ECC71", orange: "#F39C12", purple: "#9B59B6", gray: "#95A5A6" };
const COLOR_KEYS = Object.keys(COLORS);

function drawShape(shape, cx, cy, r, fill, stroke) {
  const st = stroke || "#333";
  switch (shape) {
    case "circle":
      return `<circle cx='${cx}' cy='${cy}' r='${r}' fill='${fill}' stroke='${st}' stroke-width='2'/>`;
    case "square": {
      const h = r * 0.85;
      return `<rect x='${cx - h}' y='${cy - h}' width='${h * 2}' height='${h * 2}' fill='${fill}' stroke='${st}' stroke-width='2'/>`;
    }
    case "triangle": {
      const pts = `${cx},${cy - r} ${cx + r * 0.9},${cy + r * 0.7} ${cx - r * 0.9},${cy + r * 0.7}`;
      return `<polygon points='${pts}' fill='${fill}' stroke='${st}' stroke-width='2'/>`;
    }
    case "diamond": {
      const pts = `${cx},${cy - r} ${cx + r * 0.7},${cy} ${cx},${cy + r} ${cx - r * 0.7},${cy}`;
      return `<polygon points='${pts}' fill='${fill}' stroke='${st}' stroke-width='2'/>`;
    }
    case "star": {
      const pts = [];
      for (let i = 0; i < 10; i++) {
        const a = (Math.PI / 5) * i - Math.PI / 2;
        const rad = i % 2 === 0 ? r : r * 0.45;
        pts.push(`${cx + rad * Math.cos(a)},${cy + rad * Math.sin(a)}`);
      }
      return `<polygon points='${pts.join(" ")}' fill='${fill}' stroke='${st}' stroke-width='2'/>`;
    }
    default:
      return `<circle cx='${cx}' cy='${cy}' r='${r}' fill='${fill}' stroke='${st}' stroke-width='2'/>`;
  }
}

// Transformation rules for matrix cells
const RULES = [
  // size change
  { level: 1, name: "size-big-small", apply: (shape, color, row, col) => ({ shape, color, r: col === 0 ? 22 : 13 }) },
  { level: 1, name: "color-change", apply: (shape, color, row, col) => ({ shape, color: col === 0 ? color : COLOR_KEYS[(COLOR_KEYS.indexOf(color) + 1) % COLOR_KEYS.length], r: 18 }) },
  { level: 2, name: "fill-change", apply: (shape, color, row, col) => ({ shape, color: col === 0 ? color : "none", r: 18 }) },
  { level: 2, name: "shape-row-constant", apply: (shape, color, row, col) => ({ shape, color: COLOR_KEYS[(row + col) % COLOR_KEYS.length], r: 18 }) },
  { level: 3, name: "rotation", apply: (shape, color, row, col) => ({ shape, color, r: 18, rotate: col * 45 }) },
  { level: 3, name: "size-and-color", apply: (shape, color, row, col) => ({ shape, color: COLOR_KEYS[(row + col) % COLOR_KEYS.length], r: col === 0 ? 20 : 13 }) },
  { level: 4, name: "color-grid", apply: (shape, color, row, col) => ({ shape, color: COLOR_KEYS[(row * 2 + col) % COLOR_KEYS.length], r: 18 }) },
  { level: 5, name: "shape-shift", apply: (shape, color, row, col) => ({ shape: SHAPES[(SHAPES.indexOf(shape) + col) % SHAPES.length], color, r: 18 }) },
  { level: 6, name: "dual-change", apply: (shape, color, row, col) => ({ shape: SHAPES[(SHAPES.indexOf(shape) + row) % SHAPES.length], color: COLOR_KEYS[(COLOR_KEYS.indexOf(color) + col) % COLOR_KEYS.length], r: 18 }) },
  { level: 7, name: "size-color-both", apply: (shape, color, row, col) => ({ shape, color: COLOR_KEYS[(row + col) % COLOR_KEYS.length], r: 14 + (row + col) * 3 }) },
  { level: 8, name: "complex-rotate", apply: (shape, color, row, col) => ({ shape, color, r: 18, rotate: (row + col) * 60 }) },
  { level: 9, name: "full-matrix", apply: (shape, color, row, col) => ({ shape: SHAPES[(SHAPES.indexOf(shape) + row + col) % SHAPES.length], color: COLOR_KEYS[(COLOR_KEYS.indexOf(color) + row * col) % COLOR_KEYS.length], r: 18 }) },
  { level: 10, name: "advanced-matrix", apply: (shape, color, row, col) => ({ shape: SHAPES[(SHAPES.indexOf(shape) + col * 2) % SHAPES.length], color: COLOR_KEYS[(row + col * 2) % COLOR_KEYS.length], r: 12 + row * 5 }) },
];

function getRulesForLevel(level) {
  const exact = RULES.filter(r => r.level === level);
  if (exact.length >= 1) return exact;
  return RULES.slice().sort((a, b) => Math.abs(a.level - level) - Math.abs(b.level - level));
}

function cellSvg(params, cellX, cellY, cellSize) {
  const { shape, color, r, rotate } = params;
  const cx = cellX + cellSize / 2;
  const cy = cellY + cellSize / 2;
  const drawn = drawShape(shape, cx, cy, r || 18, COLORS[color] || color);
  if (rotate) {
    return `<g transform='rotate(${rotate},${cx},${cy})'>${drawn}</g>`;
  }
  return drawn;
}

function make2x2Svg(cells, isChoice) {
  const size = 300;
  const cellSize = 70;
  const gap = 4;
  const startX = (size - (cellSize * 2 + gap)) / 2;
  const startY = 15;

  let out = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${size} ${size * 0.7}'>
  <rect width='${size}' height='${size * 0.7}' fill='#FAFAFA' rx='8'/>`;

  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      const x = startX + col * (cellSize + gap);
      const y = startY + row * (cellSize + gap);
      const isMissing = row === 1 && col === 1 && !isChoice;
      const bg = isMissing ? "#FFF9E6" : "#EEF4FB";
      const border = isMissing ? "#F0C040" : "#C8D8EC";
      out += `\n  <rect x='${x}' y='${y}' width='${cellSize}' height='${cellSize}' rx='8' fill='${bg}' stroke='${border}' stroke-width='2'/>`;
      if (isMissing) {
        out += `\n  <text x='${x + cellSize / 2}' y='${y + cellSize / 2 + 8}' font-size='28' fill='#F0C040' font-family='Arial' text-anchor='middle' font-weight='bold'>?</text>`;
      } else {
        const idx = row * 2 + col;
        if (cells[idx]) out += "\n  " + cellSvg(cells[idx], x, y, cellSize);
      }
    }
  }
  out += "\n</svg>";
  return out;
}

function makeChoiceSvg(params) {
  const size = 80;
  const cellSize = 64;
  let out = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${size} ${size}'>
  <rect width='${size}' height='${size}' fill='#EEF4FB' rx='8' stroke='#C8D8EC' stroke-width='2'/>`;
  out += "\n  " + cellSvg(params, 0, 0, cellSize);
  out += "\n</svg>";
  return out;
}

export function generate(level, seed) {
  const pool = getRulesForLevel(level);
  const rule = seed.pick(pool);
  const baseShape = seed.pick(SHAPES);
  const baseColor = seed.pick(COLOR_KEYS);

  // Build 2x2 grid: cells[0]=top-left, [1]=top-right, [2]=bottom-left, [3]=bottom-right(answer)
  const cells = [];
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      cells.push(rule.apply(baseShape, baseColor, row, col));
    }
  }

  const correctParams = cells[3];

  // 3 wrong choices: slightly different
  const wrongs = [
    rule.apply(baseShape, baseColor, 0, 0),
    rule.apply(baseShape, baseColor, 1, 0),
    rule.apply(baseShape, baseColor, 0, 1),
  ];

  const allChoices = [
    { letter: "A", params: correctParams, _correct: true },
    { letter: "B", params: wrongs[0], _correct: false },
    { letter: "C", params: wrongs[1], _correct: false },
    { letter: "D", params: wrongs[2], _correct: false },
  ];

  const shuffled = seed.shuffle(allChoices);
  const correctId = shuffled.find(c => c._correct).letter;
  const choices = shuffled.map(c => ({ id: c.letter, label: c.letter, svg: makeChoiceSvg(c.params) }));

  const idStr = `fm-L${level}-${String(seed.nextInt(1, 999)).padStart(3, "0")}`;

  return {
    id: idStr,
    subtest: "figure-matrices",
    level,
    prompt: "Look at the 2x2 grid. Find the missing piece that completes the pattern.",
    svg: make2x2Svg(cells, false),
    choices,
    correct: correctId,
    explanation: `Let's look at this one together. In this grid, each row and column follows the rule "${rule.name}". Find the shape that continues that rule in the bottom-right spot. Try one more like this tomorrow, you will get it.`,
    skill: `Figure matrix: ${rule.name}`,
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
