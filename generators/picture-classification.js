// generators/picture-classification.js
// Note: SeededRandom is passed in, not imported, to avoid path issues

const COLORS = {
  blue:   '#4A90D9',
  red:    '#E74C3C',
  green:  '#2ECC71',
  orange: '#F39C12',
  purple: '#9B59B6',
  yellow: '#F1C40F',
};

// Draw a single item SVG for a category member
function makeItemSvg(item, cx, cy, size) {
  const s = size || 28;
  switch (item) {
    // Animals
    case 'cat':
      return `<text x='${cx}' y='${cy + s * 0.35}' font-size='${s * 1.5}' text-anchor='middle' font-family='Arial'>🐱</text>`;
    case 'dog':
      return `<text x='${cx}' y='${cy + s * 0.35}' font-size='${s * 1.5}' text-anchor='middle' font-family='Arial'>🐶</text>`;
    case 'bird':
      return `<text x='${cx}' y='${cy + s * 0.35}' font-size='${s * 1.5}' text-anchor='middle' font-family='Arial'>🐦</text>`;
    case 'fish':
      return `<text x='${cx}' y='${cy + s * 0.35}' font-size='${s * 1.5}' text-anchor='middle' font-family='Arial'>🐟</text>`;
    case 'rabbit':
      return `<text x='${cx}' y='${cy + s * 0.35}' font-size='${s * 1.5}' text-anchor='middle' font-family='Arial'>🐰</text>`;
    case 'frog':
      return `<text x='${cx}' y='${cy + s * 0.35}' font-size='${s * 1.5}' text-anchor='middle' font-family='Arial'>🐸</text>`;
    // Fruits
    case 'apple':
      return `<text x='${cx}' y='${cy + s * 0.35}' font-size='${s * 1.5}' text-anchor='middle' font-family='Arial'>🍎</text>`;
    case 'banana':
      return `<text x='${cx}' y='${cy + s * 0.35}' font-size='${s * 1.5}' text-anchor='middle' font-family='Arial'>🍌</text>`;
    case 'grape':
      return `<text x='${cx}' y='${cy + s * 0.35}' font-size='${s * 1.5}' text-anchor='middle' font-family='Arial'>🍇</text>`;
    case 'orange':
      return `<text x='${cx}' y='${cy + s * 0.35}' font-size='${s * 1.5}' text-anchor='middle' font-family='Arial'>🍊</text>`;
    case 'strawberry':
      return `<text x='${cx}' y='${cy + s * 0.35}' font-size='${s * 1.5}' text-anchor='middle' font-family='Arial'>🍓</text>`;
    // Vehicles
    case 'car':
      return `<text x='${cx}' y='${cy + s * 0.35}' font-size='${s * 1.5}' text-anchor='middle' font-family='Arial'>🚗</text>`;
    case 'bus':
      return `<text x='${cx}' y='${cy + s * 0.35}' font-size='${s * 1.5}' text-anchor='middle' font-family='Arial'>🚌</text>`;
    case 'plane':
      return `<text x='${cx}' y='${cy + s * 0.35}' font-size='${s * 1.5}' text-anchor='middle' font-family='Arial'>✈️</text>`;
    case 'boat':
      return `<text x='${cx}' y='${cy + s * 0.35}' font-size='${s * 1.5}' text-anchor='middle' font-family='Arial'>⛵</text>`;
    case 'bike':
      return `<text x='${cx}' y='${cy + s * 0.35}' font-size='${s * 1.5}' text-anchor='middle' font-family='Arial'>🚲</text>`;
    // Geometric shapes (for shape categories)
    case 'circle':
      return `<circle cx='${cx}' cy='${cy}' r='${s * 0.75}' fill='${COLORS.blue}' stroke='#333' stroke-width='2'/>`;
    case 'square':
      return `<rect x='${cx - s * 0.7}' y='${cy - s * 0.7}' width='${s * 1.4}' height='${s * 1.4}' fill='${COLORS.red}' stroke='#333' stroke-width='2'/>`;
    case 'triangle': {
      const pts = `${cx},${cy - s * 0.8} ${cx + s * 0.75},${cy + s * 0.6} ${cx - s * 0.75},${cy + s * 0.6}`;
      return `<polygon points='${pts}' fill='${COLORS.green}' stroke='#333' stroke-width='2'/>`;
    }
    case 'pentagon': {
      const pts = [];
      for (let i = 0; i < 5; i++) {
        const a = (Math.PI * 2 * i / 5) - Math.PI / 2;
        pts.push(`${cx + s * 0.8 * Math.cos(a)},${cy + s * 0.8 * Math.sin(a)}`);
      }
      return `<polygon points='${pts.join(' ')}' fill='${COLORS.orange}' stroke='#333' stroke-width='2'/>`;
    }
    case 'hexagon': {
      const pts = [];
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI * 2 * i / 6);
        pts.push(`${cx + s * 0.75 * Math.cos(a)},${cy + s * 0.75 * Math.sin(a)}`);
      }
      return `<polygon points='${pts.join(' ')}' fill='${COLORS.purple}' stroke='#333' stroke-width='2'/>`;
    }
    // Colors (colored squares)
    case 'red-thing':
      return `<rect x='${cx - s * 0.7}' y='${cy - s * 0.5}' width='${s * 1.4}' height='${s}' rx='6' fill='${COLORS.red}'/>`;
    case 'blue-thing':
      return `<rect x='${cx - s * 0.7}' y='${cy - s * 0.5}' width='${s * 1.4}' height='${s}' rx='6' fill='${COLORS.blue}'/>`;
    case 'round-thing':
      return `<circle cx='${cx}' cy='${cy}' r='${s * 0.7}' fill='${COLORS.orange}'/>`;
    // Living / non-living
    case 'tree':
      return `<text x='${cx}' y='${cy + s * 0.35}' font-size='${s * 1.5}' text-anchor='middle' font-family='Arial'>🌳</text>`;
    case 'flower':
      return `<text x='${cx}' y='${cy + s * 0.35}' font-size='${s * 1.5}' text-anchor='middle' font-family='Arial'>🌸</text>`;
    case 'chair':
      return `<text x='${cx}' y='${cy + s * 0.35}' font-size='${s * 1.5}' text-anchor='middle' font-family='Arial'>🪑</text>`;
    case 'rock':
      return `<text x='${cx}' y='${cy + s * 0.35}' font-size='${s * 1.5}' text-anchor='middle' font-family='Arial'>🪨</text>`;
    case 'pencil':
      return `<text x='${cx}' y='${cy + s * 0.35}' font-size='${s * 1.5}' text-anchor='middle' font-family='Arial'>✏️</text>`;
    case 'book':
      return `<text x='${cx}' y='${cy + s * 0.35}' font-size='${s * 1.5}' text-anchor='middle' font-family='Arial'>📚</text>`;
    // Clothing
    case 'shirt':
      return `<text x='${cx}' y='${cy + s * 0.35}' font-size='${s * 1.5}' text-anchor='middle' font-family='Arial'>👕</text>`;
    case 'shoe':
      return `<text x='${cx}' y='${cy + s * 0.35}' font-size='${s * 1.5}' text-anchor='middle' font-family='Arial'>👟</text>`;
    case 'hat':
      return `<text x='${cx}' y='${cy + s * 0.35}' font-size='${s * 1.5}' text-anchor='middle' font-family='Arial'>🧢</text>`;
    case 'glove':
      return `<text x='${cx}' y='${cy + s * 0.35}' font-size='${s * 1.5}' text-anchor='middle' font-family='Arial'>🧤</text>`;
    default:
      return `<text x='${cx}' y='${cy + s * 0.35}' font-size='${s * 1.5}' text-anchor='middle' font-family='Arial'>?</text>`;
  }
}

function makePromptSvg(items) {
  // Show 3 items in a row
  const positions = [{ x: 50, y: 75 }, { x: 150, y: 75 }, { x: 250, y: 75 }];
  const shapes = positions.map((p, i) => makeItemSvg(items[i], p.x, p.y, 28));
  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 150'>
  <rect width='300' height='150' fill='#FAFAFA' rx='8'/>
  <rect x='8' y='20' width='80' height='110' rx='10' fill='#EEF4FB' stroke='#C8D8EC' stroke-width='1.5'/>
  <rect x='108' y='20' width='80' height='110' rx='10' fill='#EEF4FB' stroke='#C8D8EC' stroke-width='1.5'/>
  <rect x='208' y='20' width='80' height='110' rx='10' fill='#EEF4FB' stroke='#C8D8EC' stroke-width='1.5'/>
  ${shapes.join('\n  ')}
</svg>`;
}

function makeChoiceSvg(item) {
  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'>
  <rect width='80' height='80' rx='10' fill='#FAFAFA' stroke='#C8D8EC' stroke-width='1.5'/>
  ${makeItemSvg(item, 40, 40, 26)}
</svg>`;
}

// 35+ category templates
const TEMPLATES = [
  // L1-2: Colors and simple shapes
  { level: 1, category: 'All round shapes', members: ['circle', 'circle', 'circle'], correct: 'circle', wrong: ['square', 'triangle', 'pentagon'] },
  { level: 1, category: 'All square shapes', members: ['square', 'square', 'square'], correct: 'square', wrong: ['circle', 'triangle', 'hexagon'] },
  { level: 2, category: 'Animals', members: ['cat', 'dog', 'rabbit'], correct: 'bird', wrong: ['apple', 'car', 'chair'] },
  { level: 2, category: 'Fruits', members: ['apple', 'banana', 'grape'], correct: 'orange', wrong: ['car', 'cat', 'chair'] },
  // L3-4: Animals, fruits, vehicles
  { level: 3, category: 'Vehicles', members: ['car', 'bus', 'bike'], correct: 'plane', wrong: ['apple', 'cat', 'chair'] },
  { level: 3, category: 'Animals that swim', members: ['fish', 'frog', 'fish'], correct: 'frog', wrong: ['car', 'apple', 'chair'] },
  { level: 3, category: 'Fruits', members: ['apple', 'orange', 'strawberry'], correct: 'banana', wrong: ['car', 'dog', 'pencil'] },
  { level: 4, category: 'Animals', members: ['cat', 'bird', 'frog'], correct: 'dog', wrong: ['car', 'pencil', 'apple'] },
  { level: 4, category: 'Clothing', members: ['shirt', 'shoe', 'hat'], correct: 'glove', wrong: ['apple', 'car', 'fish'] },
  { level: 4, category: 'Things with wheels', members: ['car', 'bus', 'bike'], correct: 'boat', wrong: ['apple', 'cat', 'tree'] },
  // L5-6: living/non-living, geometry
  { level: 5, category: 'Living things', members: ['tree', 'flower', 'cat'], correct: 'dog', wrong: ['rock', 'chair', 'pencil'] },
  { level: 5, category: 'Non-living things', members: ['rock', 'chair', 'pencil'], correct: 'book', wrong: ['cat', 'tree', 'frog'] },
  { level: 5, category: 'Shapes with 3 sides', members: ['triangle', 'triangle', 'triangle'], correct: 'triangle', wrong: ['square', 'circle', 'hexagon'] },
  { level: 6, category: 'Shapes with more than 4 sides', members: ['pentagon', 'hexagon', 'pentagon'], correct: 'hexagon', wrong: ['triangle', 'square', 'circle'] },
  { level: 6, category: 'Things you wear', members: ['shirt', 'hat', 'glove'], correct: 'shoe', wrong: ['apple', 'car', 'rock'] },
  { level: 6, category: 'Animals', members: ['bird', 'fish', 'frog'], correct: 'cat', wrong: ['rock', 'pencil', 'car'] },
  // L7-8: properties
  { level: 7, category: 'Things with wings', members: ['bird', 'plane', 'bird'], correct: 'plane', wrong: ['fish', 'car', 'rock'] },
  { level: 7, category: 'Plants', members: ['tree', 'flower', 'tree'], correct: 'flower', wrong: ['fish', 'car', 'rock'] },
  { level: 7, category: 'Shapes with curved sides', members: ['circle', 'circle', 'circle'], correct: 'circle', wrong: ['triangle', 'square', 'pentagon'] },
  { level: 8, category: 'Things that grow', members: ['tree', 'flower', 'cat'], correct: 'dog', wrong: ['rock', 'pencil', 'chair'] },
  { level: 8, category: 'Polygon shapes', members: ['triangle', 'square', 'pentagon'], correct: 'hexagon', wrong: ['circle', 'rock', 'cat'] },
  { level: 8, category: 'Vehicles you ride', members: ['car', 'bike', 'bus'], correct: 'boat', wrong: ['apple', 'tree', 'flower'] },
  // L9-10: abstract
  { level: 9, category: 'Things that can fly', members: ['bird', 'plane', 'bird'], correct: 'plane', wrong: ['fish', 'car', 'rock'] },
  { level: 9, category: 'Things found in a kitchen', members: ['apple', 'banana', 'orange'], correct: 'grape', wrong: ['car', 'bike', 'tree'] },
  { level: 9, category: 'Geometric shapes', members: ['circle', 'triangle', 'square'], correct: 'hexagon', wrong: ['cat', 'car', 'tree'] },
  { level: 10, category: 'Things that are symmetric', members: ['circle', 'square', 'triangle'], correct: 'hexagon', wrong: ['cat', 'car', 'fish'] },
  { level: 10, category: 'Things with exactly 4 sides', members: ['square', 'square', 'square'], correct: 'square', wrong: ['triangle', 'circle', 'pentagon'] },
  { level: 10, category: 'Animals with fur', members: ['cat', 'dog', 'rabbit'], correct: 'cat', wrong: ['bird', 'fish', 'frog'] },
  // Extra variety
  { level: 2, category: 'Things that fly', members: ['bird', 'plane', 'bird'], correct: 'plane', wrong: ['fish', 'car', 'rock'] },
  { level: 3, category: 'Farm animals', members: ['cat', 'dog', 'rabbit'], correct: 'bird', wrong: ['car', 'pencil', 'rock'] },
  { level: 5, category: 'Things you read', members: ['book', 'book', 'book'], correct: 'book', wrong: ['car', 'apple', 'rock'] },
  { level: 6, category: 'Round things', members: ['circle', 'circle', 'circle'], correct: 'circle', wrong: ['square', 'triangle', 'pentagon'] },
  { level: 4, category: 'Things with 6 sides', members: ['hexagon', 'hexagon', 'hexagon'], correct: 'hexagon', wrong: ['triangle', 'square', 'circle'] },
  { level: 7, category: 'Clothing items', members: ['shirt', 'shoe', 'hat'], correct: 'glove', wrong: ['apple', 'car', 'fish'] },
  { level: 8, category: 'Sea creatures', members: ['fish', 'frog', 'fish'], correct: 'fish', wrong: ['dog', 'car', 'tree'] },
];

function getTemplatesForLevel(level) {
  const exact = TEMPLATES.filter(t => t.level === level);
  if (exact.length >= 2) return exact;
  const sorted = TEMPLATES.slice().sort((a, b) => Math.abs(a.level - level) - Math.abs(b.level - level));
  return sorted;
}

export function generate(level, seed) {
  const pool = getTemplatesForLevel(level);
  const tmpl = seed.pick(pool);

  const { category, members, correct, wrong } = tmpl;

  // Shuffle the 3 example members slightly (pick from same category pool if available)
  const displayMembers = [...members];

  // Build choices
  const rawChoices = [
    { item: correct, _correct: true },
    { item: wrong[0], _correct: false },
    { item: wrong[1], _correct: false },
    { item: wrong[2], _correct: false },
  ];

  const shuffled = seed.shuffle(rawChoices);
  const choiceIds = ['A', 'B', 'C', 'D'];
  const correctId = choiceIds[shuffled.findIndex(c => c._correct)];

  const choices = shuffled.map((c, i) => ({
    id: choiceIds[i],
    svg: makeChoiceSvg(c.item),
    label: c.item,
  }));

  const promptSvg = makePromptSvg(displayMembers);
  const idStr = `pc-L${level}-${String(seed.nextInt(1, 999)).padStart(3, '0')}`;

  const prompt = `Look at the three pictures. They all belong to the same group. Which one of the four choices also belongs in this group?`;

  const explanation = `Let's look at this one together. The three pictures all show "${category}". We need to find the fourth picture that fits this same group. The correct answer fits because it belongs to the same category as the examples shown.`;

  return {
    id: idStr,
    subtest: 'picture-classification',
    level,
    prompt,
    svg: promptSvg,
    choices,
    correct: correctId,
    explanation,
    skill: `Categorization: ${category}`,
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
