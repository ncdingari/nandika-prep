// generators/picture-analogies.js
// Note: SeededRandom is passed in, not imported, to avoid path issues

// Colors
const COLORS = {
  blue:   '#4A90D9',
  red:    '#E74C3C',
  green:  '#2ECC71',
  orange: '#F39C12',
  purple: '#9B59B6',
};
const COLOR_KEYS = Object.keys(COLORS);

// Shape SVG drawers (cx,cy,r for bounding circle, filled=bool, scale=1)
function drawShape(shape, cx, cy, r, fill, stroke) {
  const s = fill;
  const st = stroke || '#333';
  switch (shape) {
    case 'circle':
      return `<circle cx='${cx}' cy='${cy}' r='${r}' fill='${s}' stroke='${st}' stroke-width='2'/>`;
    case 'square': {
      const half = r * 0.85;
      return `<rect x='${cx - half}' y='${cy - half}' width='${half * 2}' height='${half * 2}' fill='${s}' stroke='${st}' stroke-width='2'/>`;
    }
    case 'triangle': {
      const pts = [
        `${cx},${cy - r}`,
        `${cx + r * 0.9},${cy + r * 0.7}`,
        `${cx - r * 0.9},${cy + r * 0.7}`,
      ].join(' ');
      return `<polygon points='${pts}' fill='${s}' stroke='${st}' stroke-width='2'/>`;
    }
    case 'star': {
      const pts = [];
      for (let i = 0; i < 10; i++) {
        const angle = (Math.PI / 5) * i - Math.PI / 2;
        const rad = i % 2 === 0 ? r : r * 0.45;
        pts.push(`${cx + rad * Math.cos(angle)},${cy + rad * Math.sin(angle)}`);
      }
      return `<polygon points='${pts.join(' ')}' fill='${s}' stroke='${st}' stroke-width='2'/>`;
    }
    case 'diamond': {
      const pts = `${cx},${cy - r} ${cx + r * 0.7},${cy} ${cx},${cy + r} ${cx - r * 0.7},${cy}`;
      return `<polygon points='${pts}' fill='${s}' stroke='${st}' stroke-width='2'/>`;
    }
    case 'heart': {
      const scale = r / 20;
      const tx = cx - 20 * scale;
      const ty = cy - 16 * scale;
      return `<path d='M ${20 * scale + tx} ${6 * scale + ty} C ${20 * scale + tx} ${3 * scale + ty} ${17 * scale + tx} ${ty} ${14 * scale + tx} ${ty} C ${11 * scale + tx} ${ty} ${9 * scale + tx} ${3 * scale + ty} ${9 * scale + tx} ${6 * scale + ty} C ${9 * scale + tx} ${10 * scale + ty} ${13 * scale + tx} ${14 * scale + ty} ${20 * scale + tx} ${18 * scale + ty} C ${27 * scale + tx} ${14 * scale + ty} ${31 * scale + tx} ${10 * scale + ty} ${31 * scale + tx} ${6 * scale + ty} C ${31 * scale + tx} ${3 * scale + ty} ${29 * scale + tx} ${ty} ${26 * scale + tx} ${ty} C ${23 * scale + tx} ${ty} ${20 * scale + tx} ${3 * scale + ty} ${20 * scale + tx} ${6 * scale + ty} Z' fill='${s}' stroke='${st}' stroke-width='2'/>`;
    }
    default:
      return `<circle cx='${cx}' cy='${cy}' r='${r}' fill='${s}' stroke='${st}' stroke-width='2'/>`;
  }
}

const SHAPES = ['circle', 'square', 'triangle', 'star', 'diamond', 'heart'];

// Draw N copies of a shape in a small area centered at cx,cy
function drawCount(shape, count, cx, cy, r, fill) {
  if (count === 1) return drawShape(shape, cx, cy, r * 0.8, fill);
  if (count === 2) {
    return drawShape(shape, cx - r * 0.7, cy, r * 0.55, fill) +
           drawShape(shape, cx + r * 0.7, cy, r * 0.55, fill);
  }
  // 3
  return drawShape(shape, cx, cy - r * 0.6, r * 0.45, fill) +
         drawShape(shape, cx - r * 0.7, cy + r * 0.5, r * 0.45, fill) +
         drawShape(shape, cx + r * 0.7, cy + r * 0.5, r * 0.45, fill);
}

// Apply transform to shape: returns SVG string
// transform: { type: 'size'|'color'|'count'|'rotation'|'reflection'|'combo', ... }
function applyTransform(shape, transform, cx, cy, r, baseColor) {
  switch (transform.type) {
    case 'size': {
      const newR = transform.target === 'big' ? r : r * 0.45;
      return drawShape(shape, cx, cy, newR, baseColor);
    }
    case 'color': {
      return drawShape(shape, cx, cy, r * 0.75, transform.target);
    }
    case 'count': {
      return drawCount(shape, transform.target, cx, cy, r, baseColor);
    }
    case 'rotation': {
      const deg = transform.target;
      return `<g transform='rotate(${deg},${cx},${cy})'>${drawShape(shape, cx, cy, r * 0.75, baseColor)}</g>`;
    }
    case 'fill': {
      // filled vs empty
      const f = transform.target === 'filled' ? baseColor : 'none';
      return drawShape(shape, cx, cy, r * 0.75, f);
    }
    case 'combo': {
      const { size, color } = transform;
      const nr = size === 'big' ? r * 0.75 : r * 0.4;
      return drawShape(shape, cx, cy, nr, color || baseColor);
    }
    default:
      return drawShape(shape, cx, cy, r * 0.75, baseColor);
  }
}

// Generate the SVG for the analogy prompt: A:B::C:?
function makePromptSvg(shapeA, shapeC, transformA, transformB, colorA, colorC) {
  // Layout: 4 cells in viewBox 300x150
  // Cell width ~65, with spacing
  // A at x=20, B at x=90, C at x=175, ? at x=245
  const cy = 75;
  const r = 30;

  const svgA = applyTransform(shapeA, transformA, 40, cy, r, COLORS[colorA]);
  const svgB = applyTransform(shapeA, transformB, 110, cy, r, COLORS[colorA]);
  const svgC = applyTransform(shapeC, transformA, 190, cy, r, COLORS[colorC]);

  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 150'>
  <rect width='300' height='150' fill='#FAFAFA' rx='8'/>
  <!-- Cell backgrounds -->
  <rect x='8' y='20' width='72' height='110' rx='8' fill='#EEF4FB' stroke='#C8D8EC' stroke-width='1.5'/>
  <rect x='90' y='20' width='72' height='110' rx='8' fill='#EEF4FB' stroke='#C8D8EC' stroke-width='1.5'/>
  <rect x='172' y='20' width='72' height='110' rx='8' fill='#EEF4FB' stroke='#C8D8EC' stroke-width='1.5'/>
  <rect x='254' y='20' width='38' height='110' rx='8' fill='#FFF9E6' stroke='#F0C040' stroke-width='2'/>
  <!-- Arrow -->
  <text x='84' y='80' font-size='18' fill='#888' font-family='Arial' text-anchor='middle'>:</text>
  <text x='166' y='80' font-size='14' fill='#888' font-family='Arial' text-anchor='middle'>as</text>
  <text x='248' y='80' font-size='18' fill='#888' font-family='Arial' text-anchor='middle'>:</text>
  ${svgA}
  ${svgB}
  ${svgC}
  <text x='273' y='82' font-size='22' fill='#F0C040' font-family='Arial' text-anchor='middle' font-weight='bold'>?</text>
</svg>`;
}

function makeChoiceSvg(shape, transform, color) {
  const svg = applyTransform(shape, transform, 40, 40, 28, COLORS[color]);
  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'>
  <rect width='80' height='80' fill='#FAFAFA' rx='8'/>
  ${svg}
</svg>`;
}

// 30+ templates: {level, shape, transformA(before), transformB(after), description}
const TEMPLATES = [
  // L1-2: size
  { level: 1, transform: 'size', tA: { type: 'size', target: 'big' }, tB: { type: 'size', target: 'small' } },
  { level: 1, transform: 'size', tA: { type: 'size', target: 'small' }, tB: { type: 'size', target: 'big' } },
  { level: 1, transform: 'fill', tA: { type: 'fill', target: 'filled' }, tB: { type: 'fill', target: 'empty' } },
  { level: 2, transform: 'fill', tA: { type: 'fill', target: 'empty' }, tB: { type: 'fill', target: 'filled' } },
  { level: 2, transform: 'size', tA: { type: 'size', target: 'big' }, tB: { type: 'size', target: 'small' } },
  { level: 2, transform: 'color', tA: { type: 'color', target: COLORS.blue }, tB: { type: 'color', target: COLORS.red } },
  // L3-4: count and rotation
  { level: 3, transform: 'count', tA: { type: 'count', target: 1 }, tB: { type: 'count', target: 2 } },
  { level: 3, transform: 'count', tA: { type: 'count', target: 2 }, tB: { type: 'count', target: 3 } },
  { level: 3, transform: 'count', tA: { type: 'count', target: 1 }, tB: { type: 'count', target: 3 } },
  { level: 4, transform: 'rotation', tA: { type: 'rotation', target: 0 }, tB: { type: 'rotation', target: 90 } },
  { level: 4, transform: 'rotation', tA: { type: 'rotation', target: 0 }, tB: { type: 'rotation', target: 180 } },
  { level: 4, transform: 'rotation', tA: { type: 'rotation', target: 90 }, tB: { type: 'rotation', target: 180 } },
  // L5-6: fill/color combos
  { level: 5, transform: 'color', tA: { type: 'color', target: COLORS.green }, tB: { type: 'color', target: COLORS.orange } },
  { level: 5, transform: 'color', tA: { type: 'color', target: COLORS.purple }, tB: { type: 'color', target: COLORS.blue } },
  { level: 5, transform: 'fill', tA: { type: 'fill', target: 'filled' }, tB: { type: 'fill', target: 'empty' } },
  { level: 6, transform: 'count', tA: { type: 'count', target: 3 }, tB: { type: 'count', target: 1 } },
  { level: 6, transform: 'combo', tA: { type: 'combo', size: 'big', color: COLORS.blue }, tB: { type: 'combo', size: 'small', color: COLORS.blue } },
  { level: 6, transform: 'combo', tA: { type: 'combo', size: 'small', color: COLORS.red }, tB: { type: 'combo', size: 'big', color: COLORS.red } },
  // L7-8: combined
  { level: 7, transform: 'combo', tA: { type: 'combo', size: 'big', color: COLORS.purple }, tB: { type: 'combo', size: 'small', color: COLORS.green } },
  { level: 7, transform: 'rotation', tA: { type: 'rotation', target: 0 }, tB: { type: 'rotation', target: 180 } },
  { level: 7, transform: 'count', tA: { type: 'count', target: 2 }, tB: { type: 'count', target: 1 } },
  { level: 8, transform: 'combo', tA: { type: 'combo', size: 'big', color: COLORS.orange }, tB: { type: 'combo', size: 'small', color: COLORS.purple } },
  { level: 8, transform: 'rotation', tA: { type: 'rotation', target: 90 }, tB: { type: 'rotation', target: 0 } },
  { level: 8, transform: 'combo', tA: { type: 'combo', size: 'small', color: COLORS.blue }, tB: { type: 'combo', size: 'big', color: COLORS.orange } },
  // L9-10: multi-attribute
  { level: 9, transform: 'combo', tA: { type: 'combo', size: 'big', color: COLORS.red }, tB: { type: 'combo', size: 'small', color: COLORS.blue } },
  { level: 9, transform: 'count', tA: { type: 'count', target: 1 }, tB: { type: 'count', target: 3 } },
  { level: 9, transform: 'rotation', tA: { type: 'rotation', target: 0 }, tB: { type: 'rotation', target: 90 } },
  { level: 10, transform: 'combo', tA: { type: 'combo', size: 'small', color: COLORS.green }, tB: { type: 'combo', size: 'big', color: COLORS.red } },
  { level: 10, transform: 'combo', tA: { type: 'combo', size: 'big', color: COLORS.blue }, tB: { type: 'combo', size: 'small', color: COLORS.purple } },
  { level: 10, transform: 'rotation', tA: { type: 'rotation', target: 180 }, tB: { type: 'rotation', target: 0 } },
  // Extra variety
  { level: 3, transform: 'color', tA: { type: 'color', target: COLORS.red }, tB: { type: 'color', target: COLORS.green } },
  { level: 4, transform: 'fill', tA: { type: 'fill', target: 'empty' }, tB: { type: 'fill', target: 'filled' } },
  { level: 5, transform: 'rotation', tA: { type: 'rotation', target: 0 }, tB: { type: 'rotation', target: 90 } },
];

function getTemplatesForLevel(level) {
  const exact = TEMPLATES.filter(t => t.level === level);
  if (exact.length >= 3) return exact;
  // Fall back: pick closest
  const sorted = TEMPLATES.slice().sort((a, b) => Math.abs(a.level - level) - Math.abs(b.level - level));
  return sorted;
}

function describeTransform(t) {
  switch (t.type) {
    case 'size': return t.target === 'big' ? 'big' : 'small';
    case 'color': return 'a different color';
    case 'count': return `${t.target}`;
    case 'rotation': return `rotated ${t.target} degrees`;
    case 'fill': return t.target === 'filled' ? 'filled in' : 'outlined only';
    case 'combo': return `${t.size} and a different color`;
    default: return 'changed';
  }
}

export function generate(level, seed) {
  const lvlTemplates = getTemplatesForLevel(level);
  const tmpl = seed.pick(lvlTemplates);

  const shapeIdx = seed.nextInt(0, SHAPES.length - 1);
  const shapeCIdx = seed.nextInt(0, SHAPES.length - 1);
  const colorAIdx = seed.nextInt(0, COLOR_KEYS.length - 1);
  const colorCIdx = seed.nextInt(0, COLOR_KEYS.length - 1);

  const shapeA = SHAPES[shapeIdx];
  const shapeC = SHAPES[shapeCIdx];
  const colorA = COLOR_KEYS[colorAIdx];
  const colorC = COLOR_KEYS[colorCIdx];

  const { tA, tB } = tmpl;

  // Correct answer applies tB to shapeC
  const correctSvg = makeChoiceSvg(shapeC, tB, colorC);

  // 3 wrong answers: vary shape/color/transform
  const wrongTransforms = [
    tA, // wrong: no transformation
    { type: 'size', target: tB.type === 'size' && tB.target === 'big' ? 'small' : 'big' },
    { type: 'rotation', target: 90 },
  ];

  const wrongColors = [
    COLOR_KEYS[(colorCIdx + 1) % COLOR_KEYS.length],
    COLOR_KEYS[(colorCIdx + 2) % COLOR_KEYS.length],
    COLOR_KEYS[(colorCIdx + 3) % COLOR_KEYS.length],
  ];

  const allChoices = [
    { id: 'A', svg: correctSvg, label: 'A', _correct: true },
    { id: 'B', svg: makeChoiceSvg(shapeC, wrongTransforms[0], colorC), label: 'B', _correct: false },
    { id: 'C', svg: makeChoiceSvg(shapeC, wrongTransforms[1], wrongColors[0]), label: 'C', _correct: false },
    { id: 'D', svg: makeChoiceSvg(SHAPES[(shapeIdx + 2) % SHAPES.length], tB, colorC), label: 'D', _correct: false },
  ];

  const shuffled = seed.shuffle(allChoices);
  const correctId = shuffled.find(c => c._correct).id;

  const choices = shuffled.map(c => ({ id: c.id, svg: c.svg, label: c.id }));

  const promptSvg = makePromptSvg(shapeA, shapeC, tA, tB, colorA, colorC);

  const idStr = `pa-L${level}-${String(seed.nextInt(1, 999)).padStart(3, '0')}`;

  const transformDesc = describeTransform(tB);
  const prompt = `Look at the shapes. The ${colorA} ${shapeA} changes to become ${transformDesc}. Which shape shows the ${colorC} ${shapeC} making the same change?`;

  const explanation = `Let's look at this one together. In the top pair, the ${shapeA} changed to be ${transformDesc}. We need to do the same change to the ${shapeC}. The answer shows the ${shapeC} with the same change applied.`;

  return {
    id: idStr,
    subtest: 'picture-analogies',
    level,
    prompt,
    svg: promptSvg,
    choices,
    correct: correctId,
    explanation,
    skill: 'Visual relationships and transformations',
  };
}

export function smokeTest(mockSeed) {
  const s = mockSeed || { next: () => 0.42, nextInt: (a, b) => Math.floor((b - a + 1) * 0.42) + a, pick: (arr) => arr[Math.floor(arr.length * 0.42)], shuffle: (arr) => [...arr] };
  return generate(3, s);
}

if (typeof process !== 'undefined' && process.argv[1] && process.argv[1].includes('generators/')) {
  const mockSeed = { next: () => 0.42, nextInt: (a, b) => Math.floor((b - a + 1) * 0.42) + a, pick: (arr) => arr[Math.floor(arr.length * 0.42)], shuffle: (arr) => [...arr] };
  const q = smokeTest(mockSeed);
  console.log(JSON.stringify(q, null, 2));
}
