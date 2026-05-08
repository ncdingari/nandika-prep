// generators/figure-classification.js
// Figure Classification questions for NandikaPrep (Nonverbal Battery)

const SHAPES = ["circle", "square", "triangle", "diamond", "star", "pentagon", "hexagon"];
const COLORS = { blue: "#4A90D9", red: "#E74C3C", green: "#2ECC71", orange: "#F39C12", purple: "#9B59B6" };
const COLOR_KEYS = Object.keys(COLORS);

function drawShape(shape, cx, cy, r, fill, strokeColor) {
  const s = fill;
  const st = strokeColor || "#333";
  switch (shape) {
    case "circle":
      return `<circle cx='${cx}' cy='${cy}' r='${r}' fill='${s}' stroke='${st}' stroke-width='2'/>`;
    case "square": {
      const h = r * 0.85;
      return `<rect x='${cx - h}' y='${cy - h}' width='${h * 2}' height='${h * 2}' fill='${s}' stroke='${st}' stroke-width='2'/>`;
    }
    case "triangle": {
      const pts = `${cx},${cy - r} ${cx + r * 0.9},${cy + r * 0.7} ${cx - r * 0.9},${cy + r * 0.7}`;
      return `<polygon points='${pts}' fill='${s}' stroke='${st}' stroke-width='2'/>`;
    }
    case "diamond": {
      const pts = `${cx},${cy - r} ${cx + r * 0.7},${cy} ${cx},${cy + r} ${cx - r * 0.7},${cy}`;
      return `<polygon points='${pts}' fill='${s}' stroke='${st}' stroke-width='2'/>`;
    }
    case "star": {
      const pts = [];
      for (let i = 0; i < 10; i++) {
        const a = (Math.PI / 5) * i - Math.PI / 2;
        const rad = i % 2 === 0 ? r : r * 0.45;
        pts.push(`${cx + rad * Math.cos(a)},${cy + rad * Math.sin(a)}`);
      }
      return `<polygon points='${pts.join(" ")}' fill='${s}' stroke='${st}' stroke-width='2'/>`;
    }
    case "pentagon": {
      const pts = [];
      for (let i = 0; i < 5; i++) {
        const a = (2 * Math.PI / 5) * i - Math.PI / 2;
        pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
      }
      return `<polygon points='${pts.join(" ")}' fill='${s}' stroke='${st}' stroke-width='2'/>`;
    }
    case "hexagon": {
      const pts = [];
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i;
        pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
      }
      return `<polygon points='${pts.join(" ")}' fill='${s}' stroke='${st}' stroke-width='2'/>`;
    }
    default:
      return `<circle cx='${cx}' cy='${cy}' r='${r}' fill='${s}' stroke='${st}' stroke-width='2'/>`;
  }
}

// Classification rules: { name, members, nonMember, description }
const RULES = [
  // Level 1-2: color-based
  { level: 1, name: "all-blue", category: "color", memberColor: "blue", memberShapes: ["circle", "square", "triangle"], oddShapes: ["diamond", "star"], oddColor: "red" },
  { level: 1, name: "all-red", category: "color", memberColor: "red", memberShapes: ["square", "triangle", "diamond"], oddShapes: ["circle", "star"], oddColor: "green" },
  { level: 2, name: "all-green", category: "color", memberColor: "green", memberShapes: ["circle", "pentagon", "diamond"], oddShapes: ["triangle", "square"], oddColor: "orange" },
  { level: 2, name: "all-orange", category: "color", memberColor: "orange", memberShapes: ["triangle", "hexagon", "star"], oddShapes: ["circle", "square"], oddColor: "blue" },
  // Level 3-4: shape-based
  { level: 3, name: "round-shapes", category: "shape", memberShapes: ["circle"], memberSizes: [18, 22, 14], oddShape: "square", description: "All round (circles)" },
  { level: 3, name: "four-sided", category: "shape", memberShapes: ["square", "diamond"], memberSizes: [18, 18, 14], oddShape: "circle", description: "All four-sided" },
  { level: 4, name: "pointed", category: "shape", memberShapes: ["triangle", "star", "diamond"], oddShape: "circle", description: "All pointed shapes" },
  { level: 4, name: "many-sides", category: "shape", memberShapes: ["pentagon", "hexagon"], oddShape: "circle", description: "Many-sided polygons" },
  // Level 5-6: size-based or fill-based
  { level: 5, name: "filled-shapes", category: "fill", fill: "filled", description: "All filled (solid)" },
  { level: 5, name: "outline-shapes", category: "fill", fill: "outline", description: "All outline (hollow)" },
  { level: 6, name: "big-shapes", category: "size", size: "big", description: "All large shapes" },
  { level: 6, name: "small-shapes", category: "size", size: "small", description: "All small shapes" },
  // Level 7-8: two-attribute
  { level: 7, name: "small-blue", category: "color+size", color: "blue", size: "small", description: "All small and blue" },
  { level: 7, name: "large-red", category: "color+size", color: "red", size: "big", description: "All large and red" },
  { level: 8, name: "filled-green", category: "fill+color", color: "green", fill: "filled", description: "All filled and green" },
  { level: 8, name: "outline-purple", category: "fill+color", color: "purple", fill: "outline", description: "All outlined and purple" },
  // Level 9-10: harder property
  { level: 9, name: "symmetric-shapes", category: "symmetry", memberShapes: ["circle", "square", "diamond"], oddShape: "triangle", description: "All symmetric left-right" },
  { level: 10, name: "curved-shapes", category: "curvature", memberShapes: ["circle"], oddShape: "triangle", description: "All curved" },
];

function getRulesForLevel(level) {
  const exact = RULES.filter(r => r.level === level);
  if (exact.length >= 1) return exact;
  return RULES.slice().sort((a, b) => Math.abs(a.level - level) - Math.abs(b.level - level));
}

function makeGroupSvg(shapes, colors, sizes, fills) {
  const w = 300;
  const h = 80;
  const cellW = 80;
  const startX = (w - shapes.length * (cellW + 8)) / 2 + 4;

  let cells = "";
  shapes.forEach((shape, i) => {
    const x = startX + i * (cellW + 8);
    const cx = x + cellW / 2;
    const cy = h / 2;
    const r = sizes[i] || 22;
    const fill = fills[i] === "outline" ? "none" : (COLORS[colors[i]] || COLORS.blue);
    const strokeColor = COLORS[colors[i]] || "#333";
    cells += `<rect x='${x}' y='8' width='${cellW}' height='${h - 16}' rx='8' fill='#EEF4FB' stroke='#C8D8EC' stroke-width='1'/>
  ${drawShape(shape, cx, cy, r, fill, strokeColor)}
  `;
  });

  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w} ${h}'>
  <rect width='${w}' height='${h}' fill='#FAFAFA' rx='8'/>
  ${cells}
</svg>`;
}

function makeChoiceSvg(shape, color, size, fill) {
  const r = size || 22;
  const fillColor = fill === "outline" ? "none" : (COLORS[color] || COLORS.blue);
  const strokeColor = COLORS[color] || "#333";
  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'>
  <rect width='80' height='80' fill='#EEF4FB' stroke='#C8D8EC' stroke-width='2' rx='8'/>
  ${drawShape(shape, 40, 40, r, fillColor, strokeColor)}
</svg>`;
}

export function generate(level, seed) {
  const pool = getRulesForLevel(level);
  const rule = seed.pick(pool);

  let groupShapes, groupColors, groupSizes, groupFills;
  let correctShape, correctColor, correctSize, correctFill;
  let wrongShape, wrongColor, wrongSize, wrongFill;
  let description;

  // Build group of 3 members and 1 correct choice
  if (rule.category === "color") {
    const memberShapes = seed.shuffle(rule.memberShapes).slice(0, 3);
    groupShapes = memberShapes;
    groupColors = [rule.memberColor, rule.memberColor, rule.memberColor];
    groupSizes = [20, 18, 22];
    groupFills = ["filled", "filled", "filled"];
    correctShape = seed.pick(rule.memberShapes);
    correctColor = rule.memberColor;
    correctSize = 20;
    correctFill = "filled";
    wrongShape = seed.pick(rule.oddShapes);
    wrongColor = rule.oddColor;
    wrongSize = 20;
    wrongFill = "filled";
    description = `All shapes are ${rule.memberColor}.`;
  } else if (rule.category === "shape") {
    const shapes = Array.from({ length: 3 }, () => seed.pick(rule.memberShapes));
    groupShapes = shapes;
    groupColors = [seed.pick(COLOR_KEYS), seed.pick(COLOR_KEYS), seed.pick(COLOR_KEYS)];
    groupSizes = [20, 18, 22];
    groupFills = ["filled", "filled", "filled"];
    correctShape = seed.pick(rule.memberShapes);
    correctColor = seed.pick(COLOR_KEYS);
    correctSize = 20;
    correctFill = "filled";
    wrongShape = rule.oddShape;
    wrongColor = seed.pick(COLOR_KEYS);
    wrongSize = 20;
    wrongFill = "filled";
    description = rule.description;
  } else if (rule.category === "fill") {
    const fillVal = rule.fill;
    const shapes3 = [seed.pick(SHAPES), seed.pick(SHAPES), seed.pick(SHAPES)];
    groupShapes = shapes3;
    groupColors = [seed.pick(COLOR_KEYS), seed.pick(COLOR_KEYS), seed.pick(COLOR_KEYS)];
    groupSizes = [20, 20, 20];
    groupFills = [fillVal, fillVal, fillVal];
    correctShape = seed.pick(SHAPES);
    correctColor = seed.pick(COLOR_KEYS);
    correctSize = 20;
    correctFill = fillVal;
    wrongShape = seed.pick(SHAPES);
    wrongColor = seed.pick(COLOR_KEYS);
    wrongSize = 20;
    wrongFill = fillVal === "filled" ? "outline" : "filled";
    description = rule.description;
  } else {
    // fallback: color-based
    const color = seed.pick(COLOR_KEYS);
    const shapes3 = [seed.pick(SHAPES), seed.pick(SHAPES), seed.pick(SHAPES)];
    groupShapes = shapes3;
    groupColors = [color, color, color];
    groupSizes = [20, 20, 20];
    groupFills = ["filled", "filled", "filled"];
    correctShape = seed.pick(SHAPES);
    correctColor = color;
    correctSize = 20;
    correctFill = "filled";
    wrongShape = seed.pick(SHAPES);
    wrongColor = COLOR_KEYS.find(c => c !== color) || "blue";
    wrongSize = 20;
    wrongFill = "filled";
    description = `All shapes share the same color: ${color}.`;
  }

  const allChoices = [
    { letter: "A", shape: correctShape, color: correctColor, size: correctSize, fill: correctFill, _correct: true },
    { letter: "B", shape: wrongShape, color: wrongColor, size: wrongSize, fill: wrongFill, _correct: false },
    { letter: "C", shape: wrongShape, color: seed.pick(COLOR_KEYS), size: wrongSize, fill: correctFill, _correct: false },
    { letter: "D", shape: seed.pick(SHAPES), color: wrongColor, size: wrongSize, fill: "outline", _correct: false },
  ];

  const shuffled = seed.shuffle(allChoices);
  const correctId = shuffled.find(c => c._correct).letter;
  const choices = shuffled.map(c => ({ id: c.letter, label: c.letter, svg: makeChoiceSvg(c.shape, c.color, c.size, c.fill) }));

  const idStr = `fc-L${level}-${String(seed.nextInt(1, 999)).padStart(3, "0")}`;
  const promptSvg = makeGroupSvg(groupShapes, groupColors, groupSizes, groupFills);

  return {
    id: idStr,
    subtest: "figure-classification",
    level,
    prompt: "Look at the three shapes. Which answer choice belongs in the same group?",
    svg: promptSvg,
    choices,
    correct: correctId,
    explanation: `Let's look at this one together. ${description} Look at each answer and find the one that shares the same property as the group. Try one more like this tomorrow, you will get it.`,
    skill: `Figure classification: ${rule.name}`,
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
