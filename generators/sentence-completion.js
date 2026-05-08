// generators/sentence-completion.js
// Note: SeededRandom is passed in, not imported, to avoid path issues

// Simple icon SVGs for answer choices
function makeWordChoiceSvg(word, emoji, bgColor) {
  const bg = bgColor || '#EEF4FB';
  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'>
  <rect width='80' height='80' rx='12' fill='${bg}' stroke='#C8D8EC' stroke-width='1.5'/>
  <text x='40' y='32' font-size='24' text-anchor='middle' font-family='Arial'>${emoji}</text>
  <text x='40' y='62' font-size='11' text-anchor='middle' font-family='Arial, sans-serif' fill='#333' font-weight='bold'>${word}</text>
</svg>`;
}

function makePromptSvg(sentence) {
  // Wrap sentence to two lines if needed
  const maxChars = 32;
  let line1 = sentence;
  let line2 = '';
  if (sentence.length > maxChars) {
    const breakAt = sentence.lastIndexOf(' ', maxChars);
    line1 = sentence.slice(0, breakAt);
    line2 = sentence.slice(breakAt + 1);
  }

  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 340 120'>
  <rect width='340' height='120' rx='12' fill='#FFFDE7' stroke='#F0C040' stroke-width='2'/>
  <!-- Speaker icon -->
  <g transform='translate(14,44)'>
    <rect x='0' y='7' width='10' height='12' rx='2' fill='#4A90D9'/>
    <polygon points='10,4 22,0 22,26 10,22' fill='#4A90D9'/>
    <path d='M25 8 Q31 13 25 18' stroke='#4A90D9' stroke-width='2.5' fill='none' stroke-linecap='round'/>
    <path d='M28 4 Q38 13 28 22' stroke='#4A90D9' stroke-width='2' fill='none' stroke-linecap='round'/>
  </g>
  <text x='170' y='${line2 ? '48' : '64'}' font-size='18' text-anchor='middle' font-family='Arial, sans-serif' fill='#333' font-weight='bold'>${line1}</text>
  ${line2 ? `<text x='170' y='76' font-size='18' text-anchor='middle' font-family='Arial, sans-serif' fill='#333' font-weight='bold'>${line2}</text>` : ''}
</svg>`;
}

// 35 sentence templates
// Each has: sentence (with ___), answer (correct word), distractors[3], emojis for all 4, level
const TEMPLATES = [
  // L1-2: simple facts
  { level: 1, sentence: 'The sun is ___.', answer: 'hot', distractors: ['cold', 'wet', 'loud'], emojis: ['☀️', '❄️', '💧', '📢'] },
  { level: 1, sentence: 'Dogs like to ___.', answer: 'bark', distractors: ['swim', 'fly', 'sleep'], emojis: ['🐶', '🏊', '🦅', '💤'] },
  { level: 1, sentence: 'Fish live in ___.', answer: 'water', distractors: ['trees', 'sand', 'clouds'], emojis: ['🐟', '🌳', '🏖️', '☁️'] },
  { level: 1, sentence: 'We sleep at ___.', answer: 'night', distractors: ['noon', 'lunch', 'morning'], emojis: ['🌙', '🌞', '🥗', '🌅'] },
  { level: 2, sentence: 'Apples grow on ___.', answer: 'trees', distractors: ['rocks', 'water', 'clouds'], emojis: ['🍎', '🪨', '💧', '☁️'] },
  { level: 2, sentence: 'Ice is very ___.', answer: 'cold', distractors: ['soft', 'loud', 'sweet'], emojis: ['🧊', '🛏️', '📢', '🍬'] },
  { level: 2, sentence: 'Birds use their wings to ___.', answer: 'fly', distractors: ['swim', 'run', 'dig'], emojis: ['🦅', '🏊', '🏃', '⛏️'] },
  { level: 2, sentence: 'We drink water when we are ___.', answer: 'thirsty', distractors: ['sleepy', 'happy', 'loud'], emojis: ['💧', '😴', '😊', '📢'] },
  // L3-4: slightly harder
  { level: 3, sentence: 'Birds have ___ to fly.', answer: 'wings', distractors: ['fins', 'legs', 'arms'], emojis: ['🪶', '🐟', '🦵', '💪'] },
  { level: 3, sentence: 'Plants need ___ to grow.', answer: 'sunlight', distractors: ['music', 'toys', 'shoes'], emojis: ['☀️', '🎵', '🧸', '👟'] },
  { level: 3, sentence: 'A library is full of ___.', answer: 'books', distractors: ['cars', 'food', 'rocks'], emojis: ['📚', '🚗', '🍕', '🪨'] },
  { level: 3, sentence: 'We use an umbrella when it ___.', answer: 'rains', distractors: ['snows', 'shines', 'blows'], emojis: ['☔', '❄️', '☀️', '💨'] },
  { level: 4, sentence: 'The baker makes bread in an ___.', answer: 'oven', distractors: ['pool', 'basket', 'garden'], emojis: ['🔥', '🏊', '🧺', '🌻'] },
  { level: 4, sentence: 'A doctor helps people who are ___.', answer: 'sick', distractors: ['happy', 'tall', 'fast'], emojis: ['🤒', '😊', '📏', '🏃'] },
  { level: 4, sentence: 'Caterpillars turn into ___.', answer: 'butterflies', distractors: ['frogs', 'birds', 'fish'], emojis: ['🦋', '🐸', '🐦', '🐟'] },
  { level: 4, sentence: 'Stars appear in the sky at ___.', answer: 'night', distractors: ['noon', 'sunrise', 'morning'], emojis: ['⭐', '🌞', '🌄', '🌅'] },
  // L5-6: feelings and reasoning
  { level: 5, sentence: 'She was ___ when she won the race.', answer: 'happy', distractors: ['sad', 'tired', 'confused'], emojis: ['😊', '😢', '😴', '😕'] },
  { level: 5, sentence: 'He tripped and hurt his knee so he ___.', answer: 'cried', distractors: ['laughed', 'ran', 'jumped'], emojis: ['😢', '😂', '🏃', '⬆️'] },
  { level: 5, sentence: 'She practiced every day so she could ___.', answer: 'improve', distractors: ['forget', 'sleep', 'hide'], emojis: ['📈', '🫥', '💤', '🙈'] },
  { level: 5, sentence: 'The ice cream melted because it was ___.', answer: 'hot', distractors: ['cold', 'windy', 'rainy'], emojis: ['🌡️', '❄️', '💨', '🌧️'] },
  { level: 6, sentence: 'The ground is wet because it ___.', answer: 'rained', distractors: ['snowed', 'froze', 'dried'], emojis: ['🌧️', '❄️', '🥶', '☀️'] },
  { level: 6, sentence: 'She brought a coat because she felt ___.', answer: 'cold', distractors: ['angry', 'bored', 'hungry'], emojis: ['🥶', '😡', '😑', '🍽️'] },
  // L7-8: cause-effect
  { level: 7, sentence: 'He studied hard, so he ___ the test.', answer: 'passed', distractors: ['forgot', 'missed', 'skipped'], emojis: ['✅', '🫥', '❌', '⏭️'] },
  { level: 7, sentence: 'She forgot her lunch so she felt ___ at noon.', answer: 'hungry', distractors: ['sleepy', 'cold', 'proud'], emojis: ['🍽️', '💤', '🥶', '🏆'] },
  { level: 7, sentence: 'Because the rope broke, the kite ___.', answer: 'fell', distractors: ['flew', 'grew', 'sang'], emojis: ['⬇️', '🪁', '🌱', '🎵'] },
  { level: 8, sentence: 'The plant wilted because it lacked ___.', answer: 'water', distractors: ['soil', 'sunlight', 'space'], emojis: ['💧', '🪨', '☀️', '📦'] },
  { level: 8, sentence: 'She saved her coins so she could ___ a toy.', answer: 'buy', distractors: ['borrow', 'hide', 'paint'], emojis: ['🛒', '🔄', '🙈', '🎨'] },
  // L9-10: complex vocabulary
  { level: 9, sentence: 'The scientist observed the data to form a ___.', answer: 'conclusion', distractors: ['sandwich', 'question', 'drawing'], emojis: ['💡', '🥪', '❓', '✏️'] },
  { level: 9, sentence: 'An author who writes many books is considered ___.', answer: 'prolific', distractors: ['lazy', 'quiet', 'tired'], emojis: ['📚', '🛋️', '🤫', '😴'] },
  { level: 9, sentence: 'When things are hard, persistence means you ___.', answer: 'keep going', distractors: ['give up', 'go home', 'turn back'], emojis: ['💪', '🚪', '🏠', '↩️'] },
  { level: 10, sentence: 'A habitat is the place where an animal ___.', answer: 'lives', distractors: ['sleeps only', 'plays', 'hides'], emojis: ['🏡', '💤', '🎮', '🙈'] },
  { level: 10, sentence: 'To estimate means to make a careful ___.', answer: 'guess', distractors: ['mistake', 'drawing', 'promise'], emojis: ['🤔', '❌', '✏️', '🤝'] },
  { level: 10, sentence: 'Camouflage helps animals ___ from predators.', answer: 'hide', distractors: ['fly away', 'attack', 'sleep'], emojis: ['🫥', '✈️', '⚔️', '💤'] },
  // Extra
  { level: 3, sentence: 'Rain comes from the ___ in the sky.', answer: 'clouds', distractors: ['ground', 'trees', 'mountains'], emojis: ['☁️', '🌍', '🌳', '⛰️'] },
  { level: 5, sentence: 'We recycle paper to ___ the environment.', answer: 'protect', distractors: ['hurt', 'ignore', 'change'], emojis: ['♻️', '💔', '👁️', '🔄'] },
];

function getTemplatesForLevel(level) {
  const exact = TEMPLATES.filter(t => t.level === level);
  if (exact.length >= 2) return exact;
  const sorted = TEMPLATES.slice().sort((a, b) => Math.abs(a.level - level) - Math.abs(b.level - level));
  return sorted;
}

const CHOICE_COLORS = ['#EEF4FB', '#FFF0F0', '#F0FFF4', '#FFF9E6'];

export function generate(level, seed) {
  const pool = getTemplatesForLevel(level);
  const tmpl = seed.pick(pool);

  const { sentence, answer, distractors, emojis } = tmpl;

  // Build choices and shuffle
  const correctIdx = seed.nextInt(0, 3);
  const allAnswers = [answer, ...distractors];
  const allEmojis = emojis;

  const rawChoices = [
    { word: answer, emoji: allEmojis[0], _correct: true },
    { word: distractors[0], emoji: allEmojis[1], _correct: false },
    { word: distractors[1], emoji: allEmojis[2], _correct: false },
    { word: distractors[2], emoji: allEmojis[3], _correct: false },
  ];

  const shuffled = seed.shuffle(rawChoices);
  const choiceIds = ['A', 'B', 'C', 'D'];
  const correctId = choiceIds[shuffled.findIndex(c => c._correct)];

  const choices = shuffled.map((c, i) => ({
    id: choiceIds[i],
    svg: makeWordChoiceSvg(c.word, c.emoji, CHOICE_COLORS[i]),
    label: c.word,
  }));

  const idStr = `sc-L${level}-${String(seed.nextInt(1, 999)).padStart(3, '0')}`;
  const prompt = sentence;
  const promptSvg = makePromptSvg(sentence);

  const explanation = `Let's look at this one together. The sentence says "${sentence.replace('___', answer)}". The word "${answer}" fits because it makes the sentence true and sensible. Try reading it out loud with the answer to hear how it sounds.`;

  return {
    id: idStr,
    subtest: 'sentence-completion',
    level,
    prompt,
    svg: promptSvg,
    choices,
    correct: correctId,
    explanation,
    skill: 'Vocabulary and sentence reasoning',
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
