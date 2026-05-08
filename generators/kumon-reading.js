// generators/kumon-reading.js
// Kumon Reading drill generator for NandikaPrep
// Valid ES module -- no build step required

// ---------------------------------------------------------------------------
// Word data
// ---------------------------------------------------------------------------

const DOLCH_WORDS = [
  'the','and','is','you','a','to','it','in','on','at','he','she','we','me','my',
  'go','do','up','can','see','come','look','said','have','like','little','one','big',
  'but','not','get','play','run','jump','fun','good','our','out','day','was','with',
  'his','her','they','this','that','what','when','will','here','who','now','how',
  'make','home','by','from','had','him','into','just','know','let','long','may',
  'more','much','must','new','no','off','old','only','over','put','some','take',
  'them','then','think','too','use','way','well','where','which','while','your',
];

const WORD_FAMILIES = {
  '-at': ['cat','bat','hat','mat','rat','sat'],
  '-an': ['can','fan','man','pan','ran','tan'],
  '-in': ['bin','fin','pin','tin','win','kin'],
  '-op': ['cop','hop','mop','pop','stop','top'],
};
const FAMILY_KEYS = Object.keys(WORD_FAMILIES);

const SILENT_E_PAIRS = [
  { base: 'cap', word: 'cape' },
  { base: 'pin', word: 'pine' },
  { base: 'kit', word: 'kite' },
  { base: 'bit', word: 'bite' },
  { base: 'hop', word: 'hope' },
  { base: 'cut', word: 'cute' },
  { base: 'man', word: 'mane' },
  { base: 'hug', word: 'huge' },
  { base: 'rid', word: 'ride' },
  { base: 'dim', word: 'dime' },
  { base: 'not', word: 'note' },
  { base: 'pip', word: 'pipe' },
];

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const SHORT_VOWEL_WORDS = [
  { word: 'cat', desc: 'a small furry pet that says meow' },
  { word: 'dog', desc: 'a friendly pet that barks' },
  { word: 'sun', desc: 'the bright star in the sky' },
  { word: 'cup', desc: 'a container for a drink' },
  { word: 'bed', desc: 'a place to sleep' },
  { word: 'map', desc: 'a picture of a place' },
  { word: 'box', desc: 'a square container' },
  { word: 'hat', desc: 'something you wear on your head' },
  { word: 'net', desc: 'used to catch fish or butterflies' },
  { word: 'bug', desc: 'a small insect' },
  { word: 'frog', desc: 'a green jumping animal' },
  { word: 'drum', desc: 'a musical instrument you hit' },
  { word: 'flag', desc: 'a colorful piece of cloth on a pole' },
  { word: 'sled', desc: 'used to slide down snowy hills' },
  { word: 'twig', desc: 'a small branch from a tree' },
];

// ---------------------------------------------------------------------------
// Helper: pick N distinct items from an array by index rotation (no loop)
// ---------------------------------------------------------------------------
function pickDistractors(pool, excludeFn, startOffset, count) {
  const result = [];
  let idx = startOffset;
  let attempts = 0;
  while (result.length < count && attempts < pool.length * 2) {
    const item = pool[idx % pool.length];
    if (!excludeFn(item) && !result.includes(item)) result.push(item);
    idx++;
    attempts++;
  }
  // Fallback: if we couldn't find enough, fill with any non-duplicate
  if (result.length < count) {
    for (let k = 0; k < pool.length && result.length < count; k++) {
      if (!result.includes(pool[k])) result.push(pool[k]);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Passages
// ---------------------------------------------------------------------------

const PASSAGES_L8 = [
  {
    passage: 'My dog Biscuit loves to run in the yard. He wags his tail when he sees me. One day he found a big stick. He dropped it at my feet. I threw the stick and he ran after it.',
    questions: [
      { q: 'What is the dog\'s name?', choices: ['Biscuit','Cookie','Fluffy'], correct: 'Biscuit' },
      { q: 'What did the dog find?', choices: ['a ball','a big stick','a bone'], correct: 'a big stick' },
      { q: 'What did the child do with the stick?', choices: ['threw it','kept it','hid it'], correct: 'threw it' },
    ],
  },
  {
    passage: 'Sam and Lily went to the park. They saw many birds by the pond. A duck waddled up to them. Lily gave the duck a piece of bread. The duck quacked and swam away.',
    questions: [
      { q: 'Where did Sam and Lily go?', choices: ['school','the park','the store'], correct: 'the park' },
      { q: 'What animal came up to them?', choices: ['a bird','a duck','a fish'], correct: 'a duck' },
      { q: 'What did Lily give the duck?', choices: ['a cracker','bread','corn'], correct: 'bread' },
    ],
  },
  {
    passage: 'Every morning Mia helps make breakfast. She cracks two eggs into a bowl. Her dad stirs them with a fork. Together they cook the eggs in a pan. Mia says it tastes the best when they make it together.',
    questions: [
      { q: 'What does Mia help make?', choices: ['lunch','breakfast','dinner'], correct: 'breakfast' },
      { q: 'What does Mia put in the bowl?', choices: ['two eggs','milk','butter'], correct: 'two eggs' },
      { q: 'Who stirs the eggs?', choices: ['Mia','her mom','her dad'], correct: 'her dad' },
    ],
  },
  {
    passage: 'The garden had many colorful flowers. Ben liked the red ones best. He watered them every day with a small can. One day a butterfly landed on a red flower. Ben stood very still and watched it.',
    questions: [
      { q: 'What color flowers did Ben like best?', choices: ['yellow','blue','red'], correct: 'red' },
      { q: 'How did Ben water the flowers?', choices: ['with a hose','with a small can','with a cup'], correct: 'with a small can' },
      { q: 'What landed on the flower?', choices: ['a bee','a butterfly','a bird'], correct: 'a butterfly' },
    ],
  },
  {
    passage: 'Tomas found a smooth stone near the river. He painted a rainbow on it with bright colors. Then he left it on the path for someone to find. A girl picked it up and smiled. That made Tomas very happy.',
    questions: [
      { q: 'Where did Tomas find the stone?', choices: ['in the park','near the river','at school'], correct: 'near the river' },
      { q: 'What did Tomas paint on the stone?', choices: ['a star','a rainbow','a flower'], correct: 'a rainbow' },
      { q: 'How did the girl feel when she found it?', choices: ['scared','happy','surprised'], correct: 'happy' },
    ],
  },
];

const PASSAGES_L9 = [
  {
    passage: 'Penguins are birds that cannot fly. They live near very cold water. They swim very fast to catch fish. Penguins have a layer of fat to stay warm. Baby penguins are fluffy and gray at first. They grow into black and white adults.',
    questions: [
      { q: 'Why are penguins special compared to most birds?', choices: ['they cannot swim','they cannot fly','they cannot eat fish'], correct: 'they cannot fly' },
      { q: 'What do penguins eat?', choices: ['plants','fish','berries'], correct: 'fish' },
      { q: 'What color are baby penguins?', choices: ['black and white','yellow','fluffy and gray'], correct: 'fluffy and gray' },
      { q: 'How do penguins stay warm?', choices: ['a layer of fat','thick feathers','staying still'], correct: 'a layer of fat' },
    ],
  },
  {
    passage: 'The school garden had four kinds of vegetables. There were tomatoes, carrots, lettuce, and peas. Each class took turns watering the plants. When the tomatoes turned red, it was time to pick them. The cook used the vegetables to make a soup for lunch.',
    questions: [
      { q: 'How many kinds of vegetables were in the garden?', choices: ['two','three','four'], correct: 'four' },
      { q: 'Who watered the plants?', choices: ['the cook','each class','the teacher'], correct: 'each class' },
      { q: 'When were the tomatoes ready to pick?', choices: ['when they turned red','when they got big','when they fell off'], correct: 'when they turned red' },
      { q: 'What did the cook make with the vegetables?', choices: ['a salad','a soup','a sandwich'], correct: 'a soup' },
    ],
  },
  {
    passage: 'Frogs start life as tiny eggs in the water. The eggs hatch into tadpoles with long tails. Over time the tadpoles grow legs. Then the tail gets shorter and disappears. At last the young frog hops onto land.',
    questions: [
      { q: 'Where do frog eggs start?', choices: ['in a tree','in the water','in the mud'], correct: 'in the water' },
      { q: 'What does a tadpole have that a frog does not?', choices: ['a long tail','four legs','a mouth'], correct: 'a long tail' },
      { q: 'What happens to the tail over time?', choices: ['it grows bigger','it disappears','it turns green'], correct: 'it disappears' },
      { q: 'Where does the young frog go at the end?', choices: ['deeper water','land','a tree'], correct: 'land' },
    ],
  },
  {
    passage: 'My family loves to go camping in the summer. We set up our tent near a quiet stream. At night we sit around a campfire and tell stories. In the morning the birds wake us up with their songs. We cook pancakes on a little camp stove and eat outside.',
    questions: [
      { q: 'When does the family go camping?', choices: ['winter','summer','spring'], correct: 'summer' },
      { q: 'Where do they set up the tent?', choices: ['near a lake','near a quiet stream','on a hill'], correct: 'near a quiet stream' },
      { q: 'What wakes them up in the morning?', choices: ['an alarm','the birds','the stream'], correct: 'the birds' },
      { q: 'What do they cook in the morning?', choices: ['eggs','pancakes','oatmeal'], correct: 'pancakes' },
    ],
  },
];

const PASSAGES_L12 = [
  {
    passage: 'A lighthouse stands on a rocky cliff above the sea. Every night a bright light spins around inside the tower. Ships far away can see the flashing light. It warns the sailors about the dangerous rocks below. Long ago a keeper lived in the lighthouse and kept the light burning. Today most lighthouses run on electricity and work on their own.\n\nThe nearest town has a small lighthouse museum. Visitors can climb the tall stairs to the top. From there you can see the ocean for many miles. Children often ask how the keeper felt living so far from town. The museum guide says the keeper loved the sound of the waves and the fresh salty air.',
    questions: [
      { q: 'What is the main purpose of a lighthouse?', choices: ['to house sailors','to warn ships about rocks','to light up the town'], correct: 'to warn ships about rocks' },
      { q: 'Who used to live in the lighthouse?', choices: ['a sailor','a fisherman','a keeper'], correct: 'a keeper' },
      { q: 'How do most lighthouses work today?', choices: ['with oil lamps','with electricity','with solar panels'], correct: 'with electricity' },
      { q: 'What can visitors do at the museum?', choices: ['sleep in the lighthouse','climb to the top','meet a real keeper'], correct: 'climb to the top' },
      { q: 'What did the keeper love about living there?', choices: ['the quiet nights','the waves and salty air','the view of the town'], correct: 'the waves and salty air' },
    ],
  },
  {
    passage: 'Monarch butterflies travel thousands of miles every year. In the fall they fly south to warmer places. Millions of them gather in forests in Mexico. They rest on the trees and the branches look orange from far away. In spring they fly north again as the weather gets warmer.\n\nScientists find the long journey amazing. No single butterfly makes the whole trip twice. The butterflies that fly south in fall are great-grandchildren of the ones that flew north that spring. Yet they know the right direction to fly. Researchers think they use the sun as a compass to find their way.',
    questions: [
      { q: 'Where do monarch butterflies go in the fall?', choices: ['to Canada','to Mexico','to California'], correct: 'to Mexico' },
      { q: 'Why do the trees look orange?', choices: ['the leaves change color','millions of butterflies rest on them','the sun shines on them'], correct: 'millions of butterflies rest on them' },
      { q: 'What is surprising about the butterfly journey?', choices: ['it is very short','no single butterfly makes the whole trip twice','they fly alone'], correct: 'no single butterfly makes the whole trip twice' },
      { q: 'What do researchers think the butterflies use to find direction?', choices: ['stars','the moon','the sun'], correct: 'the sun' },
      { q: 'When do the butterflies fly north?', choices: ['in the fall','in the winter','in the spring'], correct: 'in the spring' },
    ],
  },
  {
    passage: 'Honeybees live together in large groups called colonies. Inside the hive thousands of worker bees do different jobs. Some bees collect nectar from flowers. Others guard the entrance to the hive. A few bees fan the honey with their wings to help it dry.\n\nThe queen bee lays hundreds of eggs every day. Worker bees feed and care for the young bees that hatch. When a hive gets too crowded the queen flies off with half the bees to start a new colony. Bees are important because they help flowers make seeds. Without bees many plants could not grow.',
    questions: [
      { q: 'What do some worker bees collect from flowers?', choices: ['pollen only','nectar','seeds'], correct: 'nectar' },
      { q: 'What does the queen bee do every day?', choices: ['collects nectar','lays hundreds of eggs','fans the honey'], correct: 'lays hundreds of eggs' },
      { q: 'What happens when the hive gets too crowded?', choices: ['bees die off','the queen leaves with half the bees','worker bees stop working'], correct: 'the queen leaves with half the bees' },
      { q: 'Why are bees important?', choices: ['they make wax','they help flowers make seeds','they clean the hive'], correct: 'they help flowers make seeds' },
      { q: 'What do some bees do with their wings inside the hive?', choices: ['cool the queen','fan the honey to dry it','make noise'], correct: 'fan the honey to dry it' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Vocabulary-in-context data for L10
// ---------------------------------------------------------------------------

const VOCAB_ITEMS = [
  { sentence: 'The puppy was so tiny it could fit in my hand.', underlined: 'tiny', choices: ['very small','very loud','very soft'], correct: 'very small' },
  { sentence: 'She was nervous before her big recital.', underlined: 'nervous', choices: ['worried','excited','sleepy'], correct: 'worried' },
  { sentence: 'The forest was dense with tall trees and thick bushes.', underlined: 'dense', choices: ['empty','packed close together','very old'], correct: 'packed close together' },
  { sentence: 'He was exhausted after running three laps.', underlined: 'exhausted', choices: ['very tired','very hungry','very happy'], correct: 'very tired' },
  { sentence: 'The river flows rapidly down the mountain.', underlined: 'rapidly', choices: ['slowly','very fast','quietly'], correct: 'very fast' },
  { sentence: 'She gave a cheerful wave when she saw her friend.', underlined: 'cheerful', choices: ['happy','shy','angry'], correct: 'happy' },
  { sentence: 'The kitten hid beneath the sofa.', underlined: 'beneath', choices: ['on top of','under','beside'], correct: 'under' },
  { sentence: 'It was chilly outside so we wore our coats.', underlined: 'chilly', choices: ['cool and cold','hot','rainy'], correct: 'cool and cold' },
  { sentence: 'The students were eager to start the art project.', underlined: 'eager', choices: ['very excited and ready','bored','confused'], correct: 'very excited and ready' },
  { sentence: 'The cake was moist and tasted wonderful.', underlined: 'moist', choices: ['dry','soft and slightly wet','burnt'], correct: 'soft and slightly wet' },
  { sentence: 'The puppy leaped over the puddle with ease.', underlined: 'leaped', choices: ['walked','jumped','crawled'], correct: 'jumped' },
  { sentence: 'We spotted a rare bird in the garden.', underlined: 'rare', choices: ['colorful','not often seen','very big'], correct: 'not often seen' },
  { sentence: 'The soup was too hot so she waited for it to cool.', underlined: 'cool', choices: ['get cold','get warm','get spicy'], correct: 'get cold' },
  { sentence: 'He gathered sticks to build a small shelter.', underlined: 'gathered', choices: ['collected','made','threw'], correct: 'collected' },
  { sentence: 'The path through the woods was narrow.', underlined: 'narrow', choices: ['not wide','very long','very dark'], correct: 'not wide' },
  { sentence: 'The class was very noisy until the teacher spoke.', underlined: 'noisy', choices: ['quiet','making a lot of sound','busy'], correct: 'making a lot of sound' },
  { sentence: 'She placed the fragile vase on the shelf carefully.', underlined: 'fragile', choices: ['heavy','easy to break','beautiful'], correct: 'easy to break' },
  { sentence: 'He was determined to finish the puzzle.', underlined: 'determined', choices: ['giving up','trying hard to do something','confused'], correct: 'trying hard to do something' },
  { sentence: 'The pond was still and reflected the trees.', underlined: 'still', choices: ['moving fast','not moving','very deep'], correct: 'not moving' },
  { sentence: 'She was curious about what was inside the box.', underlined: 'curious', choices: ['scared','wanting to know more','bored'], correct: 'wanting to know more' },
  { sentence: 'He tugged the rope with all his strength.', underlined: 'tugged', choices: ['pulled hard','let go','tied'], correct: 'pulled hard' },
  { sentence: 'The trail was steep and hard to climb.', underlined: 'steep', choices: ['going sharply upward','wide','smooth'], correct: 'going sharply upward' },
  { sentence: 'The bread was fresh and had a wonderful smell.', underlined: 'fresh', choices: ['old','newly made','sweet'], correct: 'newly made' },
  { sentence: 'She whispered so she would not wake the baby.', underlined: 'whispered', choices: ['spoke very quietly','shouted','sang'], correct: 'spoke very quietly' },
  { sentence: 'The children were delighted by the surprise party.', underlined: 'delighted', choices: ['very happy','very surprised','confused'], correct: 'very happy' },
];

// ---------------------------------------------------------------------------
// Sequencing data for L11
// ---------------------------------------------------------------------------

const SEQUENCE_STORIES = [
  {
    sentences: [
      'First, she put on her boots.',
      'Next, she opened the door and stepped outside.',
      'Then she saw the fresh snow covering the yard.',
      'Finally, she made a big snowball and laughed.',
    ],
  },
  {
    sentences: [
      'He picked up the seeds from the packet.',
      'He dug small holes in the soil with his finger.',
      'He dropped one seed into each hole.',
      'He watered the ground and waited for spring.',
    ],
  },
  {
    sentences: [
      'She found a caterpillar on a leaf.',
      'She watched it eat the leaf slowly.',
      'A few days later it made a cocoon.',
      'Two weeks later a butterfly flew away.',
    ],
  },
  {
    sentences: [
      'Tom woke up and smelled pancakes cooking.',
      'He ran downstairs to the kitchen.',
      'His mom put a warm plate in front of him.',
      'He poured maple syrup and took a big bite.',
    ],
  },
  {
    sentences: [
      'The team practiced kicking the ball each morning.',
      'On game day everyone wore their uniforms.',
      'They scored two goals in the first half.',
      'The crowd cheered when they won the game.',
    ],
  },
  {
    sentences: [
      'She chose a book from the library shelf.',
      'She found a quiet chair by the window.',
      'She read three chapters without stopping.',
      'She checked out the book to finish it at home.',
    ],
  },
  {
    sentences: [
      'He cracked the eggs into a bowl.',
      'He added milk and stirred the mixture.',
      'He poured it into a hot pan.',
      'The scrambled eggs were ready in three minutes.',
    ],
  },
  {
    sentences: [
      'Maya spotted a frog near the pond.',
      'She sat very still so it would not hop away.',
      'She watched it catch a fly with its tongue.',
      'Then it dove into the water with a splash.',
    ],
  },
];

// ---------------------------------------------------------------------------
// Writing prompts
// ---------------------------------------------------------------------------

const WRITING_PROMPTS = {
  copy: [
    'The cat sat on the mat.',
    'I like to play in the park.',
    'The dog runs fast.',
    'We eat lunch at noon.',
    'My favorite color is blue.',
    'The sun is bright today.',
    'I see a big red apple.',
    'She has a little pet fish.',
    'The bird sings in the tree.',
    'We walk to school each day.',
    'He kicks the ball far.',
    'It is fun to read books.',
    'The rain falls on the roof.',
    'I can jump very high.',
    'My mom made a yummy cake.',
    'The frog hops on the log.',
    'We play games with our friends.',
    'The baby sleeps in the crib.',
    'A duck swims in the pond.',
    'I brush my teeth at night.',
    'The wind blows the leaves around.',
    'She drew a picture of a house.',
    'He found a shiny rock on the path.',
    'Our class has a pet hamster.',
    'I love to eat strawberries.',
    'The stars come out at night.',
    'We sang a song together.',
    'The kite flew up in the sky.',
    'My dog wags his tail a lot.',
    'She wore her red boots in the rain.',
  ],
  stem: [
    'My favorite animal is ___ because',
    'One day I found a ___ in the garden and',
    'If I could fly I would',
    'The best thing about summer is',
    'I helped my friend when',
    'My favorite food is ___ and I like it because',
    'If I had a magic crayon I would draw',
    'After school I like to',
    'The funniest thing that happened was',
    'A new pet I would want is ___ because',
    'One thing I am good at is',
    'When it rains I like to',
    'My favorite book is about',
    'I was surprised when',
    'On weekends my family',
    'If I could visit any place I would go to',
    'My favorite season is ___ because',
    'Something kind I did was',
    'The best thing about my school is',
    'I feel happy when',
    'My favorite game to play is ___ because',
    'If I could be any animal I would be',
    'Something I want to learn how to do is',
    'I take care of my pet by',
    'The best gift I ever got was',
    'When I grow up I want to',
    'My favorite thing to do outside is',
    'One thing I like about my family is',
    'I helped someone today by',
    'If I found a treasure chest I would',
  ],
  answer: [
    'What was the main thing that happened in the story?',
    'Why did the character make that choice?',
    'How did the character feel at the end?',
    'What would you do if you were in the story?',
    'What is the most important lesson in the passage?',
    'Describe how the problem in the story was solved.',
    'What happened first in the passage?',
    'How did the setting affect what happened?',
    'What made the character happy or sad?',
    'What did you learn from reading this passage?',
    'Why is the topic in the passage important?',
    'What details in the passage helped you answer the question?',
    'How would the story change if the setting were different?',
    'What do you think will happen next in the story?',
    'How are the two characters in the story alike?',
    'What clues helped you find the answer in the text?',
    'Explain the main idea of the passage in your own words.',
    'What is one fact you learned from this passage?',
    'How did the character solve the problem?',
    'Which part of the story was most interesting to you and why?',
    'What did the author want you to learn?',
    'How did the beginning connect to the end of the passage?',
    'Name one cause and one effect in the passage.',
    'Why did the author use descriptive words in this part?',
    'What would you tell a friend about this passage?',
    'What question would you ask the author?',
    'How did the character change from the start to the end?',
    'What was your favorite part and why?',
    'What does the passage tell us about the main character?',
    'How does the title connect to what you read?',
  ],
  open: [
    'Write about your favorite place to spend time outdoors.',
    'If you could invent something new what would it be and why?',
    'Describe a time you worked with others to do something.',
    'Write about an animal you find interesting and what makes it special.',
    'If you could travel anywhere in the world where would you go?',
    'Describe what a perfect day looks like for you.',
    'Write about something you have learned to do well.',
    'If you could change one thing about your school what would it be?',
    'Write about a book or story that you really liked.',
    'Describe a person who is important to you and why.',
    'Write about your favorite meal and how it is made.',
    'If you could have any superpower what would it be?',
    'Describe something that makes you feel proud.',
    'Write about a problem in your community and how it could be solved.',
    'If you could meet any animal in the world which one would you choose?',
    'Describe what it would be like to live in a treehouse.',
    'Write about a goal you have and how you plan to reach it.',
    'Describe a game or sport you enjoy and how it is played.',
    'Write about something that surprised you recently.',
    'If you could make a new holiday what would it celebrate?',
    'Describe a time you helped someone.',
    'Write about your favorite season and why you like it best.',
    'If you could have any job in the world what would it be?',
    'Describe something you wonder about in nature.',
    'Write about a tradition your family has.',
    'If you could redesign your school what would you add?',
    'Describe what it means to be a good friend.',
    'Write about a challenge you faced and how you handled it.',
    'If animals could talk what do you think yours would say?',
    'Describe your favorite memory from the past year.',
  ],
};

// ---------------------------------------------------------------------------
// Level-specific generators -- ALL distractor selection is index-based,
// never relying on a loop that calls seed.pick repeatedly.
// ---------------------------------------------------------------------------

function genL1Items(seed, count) {
  // Pick target letter by index into LETTERS, pick 3 distractors at fixed offsets
  const items = [];
  const offset = seed.nextInt(0, LETTERS.length - 1);
  for (let i = 0; i < count; i++) {
    const tIdx = (offset + i * 7) % LETTERS.length;
    const target = LETTERS[tIdx];
    // distractors at fixed offsets from target index
    const d1 = LETTERS[(tIdx + 1) % LETTERS.length];
    const d2 = LETTERS[(tIdx + 5) % LETTERS.length];
    const d3 = LETTERS[(tIdx + 11) % LETTERS.length];
    const choices = seed.shuffle([target, d1, d2, d3]);
    items.push({
      id: `kr-L1-${String(i + 1).padStart(3, '0')}`,
      type: 'letter',
      prompt: `Which letter is ${target}?`,
      choices,
      correct: target,
    });
  }
  return items;
}

const BEGINNING_SOUND_SETS = [
  { target: 'cat', words: ['dog','cup','hat','big'], correct: 'cup' },
  { target: 'sun', words: ['mop','sat','hop','fan'], correct: 'sat' },
  { target: 'big', words: ['cat','run','bag','hat'], correct: 'bag' },
  { target: 'fan', words: ['dog','hat','fun','tap'], correct: 'fun' },
  { target: 'hat', words: ['mat','hop','cat','lap'], correct: 'hop' },
  { target: 'man', words: ['cat','hat','mud','fat'], correct: 'mud' },
  { target: 'tap', words: ['hat','sit','dog','cup'], correct: 'sit' },
  { target: 'pig', words: ['cat','dog','pot','hat'], correct: 'pot' },
  { target: 'run', words: ['cap','red','tip','dog'], correct: 'red' },
  { target: 'log', words: ['cat','hat','lip','dog'], correct: 'lip' },
  { target: 'net', words: ['bat','nap','top','dog'], correct: 'nap' },
  { target: 'dog', words: ['cat','hat','dip','top'], correct: 'dip' },
  { target: 'win', words: ['hat','dog','wig','top'], correct: 'wig' },
  { target: 'gate', words: ['hat','top','got','map'], correct: 'got' },
  { target: 'kite', words: ['hat','top','dog','kid'], correct: 'kid' },
];

function genL2Items(seed, count) {
  const items = [];
  const offset = seed.nextInt(0, BEGINNING_SOUND_SETS.length - 1);
  for (let i = 0; i < count; i++) {
    const s = BEGINNING_SOUND_SETS[(offset + i) % BEGINNING_SOUND_SETS.length];
    const choices = seed.shuffle([...s.words]);
    items.push({
      id: `kr-L2-${String(i + 1).padStart(3, '0')}`,
      type: 'sound',
      prompt: `Which word starts with the same sound as '${s.target}'?`,
      choices,
      correct: s.correct,
    });
  }
  return items;
}

function genL3Items(seed, count) {
  const items = [];
  const offset = seed.nextInt(0, DOLCH_WORDS.length - 1);
  for (let i = 0; i < count; i++) {
    const tIdx = (offset + i) % DOLCH_WORDS.length;
    const target = DOLCH_WORDS[tIdx];
    // pick 3 distractors at fixed offsets, guaranteed distinct from target
    const d1 = DOLCH_WORDS[(tIdx + 3) % DOLCH_WORDS.length];
    const d2 = DOLCH_WORDS[(tIdx + 7) % DOLCH_WORDS.length];
    const d3 = DOLCH_WORDS[(tIdx + 13) % DOLCH_WORDS.length];
    const choices = seed.shuffle([target, d1, d2, d3]);
    items.push({
      id: `kr-L3-${String(i + 1).padStart(3, '0')}`,
      type: 'sight',
      prompt: `Read this word: ${target}`,
      choices,
      correct: target,
    });
  }
  return items;
}

function genL4Items(seed, count) {
  // families: -at=0, -an=1, -in=2, -op=3
  const famArrays = FAMILY_KEYS.map(k => WORD_FAMILIES[k]);
  const items = [];
  const offset = seed.nextInt(0, 3);
  for (let i = 0; i < count; i++) {
    const fIdx = (offset + i) % 4;
    const family = FAMILY_KEYS[fIdx];
    const words = famArrays[fIdx];
    const correctWord = words[i % words.length];
    // distractors from other families at fixed positions
    const d1 = famArrays[(fIdx + 1) % 4][i % famArrays[(fIdx + 1) % 4].length];
    const d2 = famArrays[(fIdx + 2) % 4][i % famArrays[(fIdx + 2) % 4].length];
    const d3 = famArrays[(fIdx + 3) % 4][i % famArrays[(fIdx + 3) % 4].length];
    const choices = seed.shuffle([correctWord, d1, d2, d3]);
    items.push({
      id: `kr-L4-${String(i + 1).padStart(3, '0')}`,
      type: 'family',
      prompt: `Which word belongs to the ${family} family?`,
      choices,
      correct: correctWord,
    });
  }
  return items;
}

function genL5Items(seed, count) {
  const items = [];
  const offset = seed.nextInt(0, SHORT_VOWEL_WORDS.length - 1);
  for (let i = 0; i < count; i++) {
    const tIdx = (offset + i) % SHORT_VOWEL_WORDS.length;
    const target = SHORT_VOWEL_WORDS[tIdx];
    // pick 3 distractors at fixed offsets
    const d1 = SHORT_VOWEL_WORDS[(tIdx + 1) % SHORT_VOWEL_WORDS.length].word;
    const d2 = SHORT_VOWEL_WORDS[(tIdx + 4) % SHORT_VOWEL_WORDS.length].word;
    const d3 = SHORT_VOWEL_WORDS[(tIdx + 8) % SHORT_VOWEL_WORDS.length].word;
    const choices = seed.shuffle([target.word, d1, d2, d3]);
    items.push({
      id: `kr-L5-${String(i + 1).padStart(3, '0')}`,
      type: 'vowel',
      prompt: `Which picture shows a ${target.word}? (${target.desc})`,
      choices,
      correct: target.word,
    });
  }
  return items;
}

const SILENT_E_DISTRACTORS = ['cape','pine','kite','bite','hope','cute','mane','huge','ride','dime','note','pipe','late','five','tube','bone'];

function genL6Items(seed, count) {
  const items = [];
  const offset = seed.nextInt(0, SILENT_E_PAIRS.length - 1);
  for (let i = 0; i < count; i++) {
    const pair = SILENT_E_PAIRS[(offset + i) % SILENT_E_PAIRS.length];
    // pick 3 distractors from SILENT_E_DISTRACTORS, not equal to pair.word
    const dPool = SILENT_E_DISTRACTORS.filter(w => w !== pair.word);
    const d1 = dPool[(i) % dPool.length];
    const d2 = dPool[(i + 3) % dPool.length];
    const d3 = dPool[(i + 7) % dPool.length];
    const choices = seed.shuffle([pair.word, d1, d2, d3]);
    items.push({
      id: `kr-L6-${String(i + 1).padStart(3, '0')}`,
      type: 'longe',
      prompt: `Add silent e to make a new word: ${pair.base} -> ?`,
      choices,
      correct: pair.word,
    });
  }
  return items;
}

const FILL_IN_SENTENCES = [
  { prompt: 'The dog ___ in the park.', choices: ['ran','run','running','runs'], correct: 'ran' },
  { prompt: 'She ___ her lunch at school.', choices: ['ate','eats','eating','eat'], correct: 'ate' },
  { prompt: 'The bird ___ high in the sky.', choices: ['flew','fly','flies','flying'], correct: 'flew' },
  { prompt: 'We ___ a game after school.', choices: ['played','play','playing','plays'], correct: 'played' },
  { prompt: 'He ___ his homework before dinner.', choices: ['finished','finish','finishes','finishing'], correct: 'finished' },
  { prompt: 'The cat ___ on the warm mat.', choices: ['slept','sleep','sleeping','sleeps'], correct: 'slept' },
  { prompt: 'They ___ to the park on Saturday.', choices: ['walked','walk','walks','walking'], correct: 'walked' },
  { prompt: 'She ___ a pretty picture for her mom.', choices: ['drew','draw','drawing','draws'], correct: 'drew' },
  { prompt: 'The baby ___ when she was hungry.', choices: ['cried','cry','cries','crying'], correct: 'cried' },
  { prompt: 'He ___ the ball over the fence.', choices: ['kicked','kick','kicks','kicking'], correct: 'kicked' },
  { prompt: 'The flowers ___ in the spring.', choices: ['bloom','bloomed','blooming','blooms'], correct: 'bloomed' },
  { prompt: 'We ___ songs at the party.', choices: ['sang','sing','sings','singing'], correct: 'sang' },
  { prompt: 'She ___ her bike to school.', choices: ['rode','ride','rides','riding'], correct: 'rode' },
  { prompt: 'The frog ___ into the pond.', choices: ['jumped','jump','jumping','jumps'], correct: 'jumped' },
  { prompt: 'He ___ a glass of cold water.', choices: ['drank','drink','drinks','drinking'], correct: 'drank' },
  { prompt: 'The wind ___ all the leaves away.', choices: ['blew','blow','blows','blowing'], correct: 'blew' },
  { prompt: 'She ___ a story to her little brother.', choices: ['told','tell','tells','telling'], correct: 'told' },
  { prompt: 'The sun ___ brightly all morning.', choices: ['shone','shine','shines','shining'], correct: 'shone' },
  { prompt: 'They ___ their dinner quickly.', choices: ['ate','eat','eats','eating'], correct: 'ate' },
  { prompt: 'He ___ the door open for her.', choices: ['held','hold','holds','holding'], correct: 'held' },
];

function genL7Items(seed, count) {
  const items = [];
  const offset = seed.nextInt(0, FILL_IN_SENTENCES.length - 1);
  for (let i = 0; i < count; i++) {
    const s = FILL_IN_SENTENCES[(offset + i) % FILL_IN_SENTENCES.length];
    const choices = seed.shuffle([...s.choices]);
    items.push({
      id: `kr-L7-${String(i + 1).padStart(3, '0')}`,
      type: 'fill',
      prompt: s.prompt,
      choices,
      correct: s.correct,
    });
  }
  return items;
}

function genL8Items(seed) {
  // 5 passages x 3 questions = 15 items
  const items = [];
  const offset = seed.nextInt(0, PASSAGES_L8.length - 1);
  let idx = 0;
  for (let p = 0; p < 5; p++) {
    const psg = PASSAGES_L8[(offset + p) % PASSAGES_L8.length];
    for (const qObj of psg.questions) {
      const choices = seed.shuffle([...qObj.choices]);
      items.push({
        id: `kr-L8-${String(idx + 1).padStart(3, '0')}`,
        type: 'passage',
        passage: psg.passage,
        prompt: qObj.q,
        choices,
        correct: qObj.correct,
      });
      idx++;
    }
  }
  return items;
}

function genL9Items(seed) {
  // 4 passages x 4 questions = 16 items
  const items = [];
  const offset = seed.nextInt(0, PASSAGES_L9.length - 1);
  let idx = 0;
  for (let p = 0; p < 4; p++) {
    const psg = PASSAGES_L9[(offset + p) % PASSAGES_L9.length];
    for (const qObj of psg.questions) {
      const choices = seed.shuffle([...qObj.choices]);
      items.push({
        id: `kr-L9-${String(idx + 1).padStart(3, '0')}`,
        type: 'passage',
        passage: psg.passage,
        prompt: qObj.q,
        choices,
        correct: qObj.correct,
      });
      idx++;
    }
  }
  return items;
}

function genL10Items(seed, count) {
  const items = [];
  const offset = seed.nextInt(0, VOCAB_ITEMS.length - 1);
  for (let i = 0; i < count; i++) {
    const v = VOCAB_ITEMS[(offset + i) % VOCAB_ITEMS.length];
    const choices = seed.shuffle([...v.choices]);
    items.push({
      id: `kr-L10-${String(i + 1).padStart(3, '0')}`,
      type: 'vocab',
      prompt: `"${v.sentence}" What does the word "${v.underlined}" mean?`,
      choices,
      correct: v.correct,
    });
  }
  return items;
}

function genL11Items(seed) {
  // 8 stories x 4 questions = 32 items
  const items = [];
  const offset = seed.nextInt(0, SEQUENCE_STORIES.length - 1);
  let idx = 0;
  const POSITION_LABELS = ['FIRST', 'SECOND', 'THIRD', 'LAST'];
  for (let s = 0; s < 8; s++) {
    const story = SEQUENCE_STORIES[(offset + s) % SEQUENCE_STORIES.length];
    const shuffled = seed.shuffle([...story.sentences]);
    for (let pos = 0; pos < 4; pos++) {
      items.push({
        id: `kr-L11-${String(idx + 1).padStart(3, '0')}`,
        type: 'sequence',
        prompt: `Put these sentences in order. Which sentence comes ${POSITION_LABELS[pos]}?`,
        choices: shuffled,
        correct: story.sentences[pos],
      });
      idx++;
    }
  }
  return items;
}

function genL12Items(seed) {
  // 3 passages x 5 questions = 15 items
  const items = [];
  const offset = seed.nextInt(0, PASSAGES_L12.length - 1);
  let idx = 0;
  for (let p = 0; p < 3; p++) {
    const psg = PASSAGES_L12[(offset + p) % PASSAGES_L12.length];
    for (const qObj of psg.questions) {
      const choices = seed.shuffle([...qObj.choices]);
      items.push({
        id: `kr-L12-${String(idx + 1).padStart(3, '0')}`,
        type: 'passage',
        passage: psg.passage,
        prompt: qObj.q,
        choices,
        correct: qObj.correct,
      });
      idx++;
    }
  }
  return items;
}

// ---------------------------------------------------------------------------
// Writing prompt selector
// ---------------------------------------------------------------------------

function getWritingPrompt(level, seed) {
  if (level <= 3) {
    const idx = seed.nextInt(0, WRITING_PROMPTS.copy.length - 1);
    return { type: 'copy', text: WRITING_PROMPTS.copy[idx], minChars: 10, maxChars: 60 };
  } else if (level <= 6) {
    const idx = seed.nextInt(0, WRITING_PROMPTS.stem.length - 1);
    return { type: 'stem', text: WRITING_PROMPTS.stem[idx], minChars: 20, maxChars: 80 };
  } else if (level <= 9) {
    const idx = seed.nextInt(0, WRITING_PROMPTS.answer.length - 1);
    return { type: 'answer', text: WRITING_PROMPTS.answer[idx], minChars: 30, maxChars: 120 };
  } else {
    const idx = seed.nextInt(0, WRITING_PROMPTS.open.length - 1);
    return { type: 'open', text: WRITING_PROMPTS.open[idx], minChars: 40, maxChars: 150 };
  }
}

// ---------------------------------------------------------------------------
// Level config
// ---------------------------------------------------------------------------

const LEVEL_CONFIG = [
  null,
  { sct: 300 },  // L1
  { sct: 300 },  // L2
  { sct: 360 },  // L3
  { sct: 360 },  // L4
  { sct: 420 },  // L5
  { sct: 420 },  // L6
  { sct: 480 },  // L7
  { sct: 540 },  // L8
  { sct: 600 },  // L9
  { sct: 480 },  // L10
  { sct: 540 },  // L11
  { sct: 600 },  // L12
];

const EXPECTED_COUNTS = [null, 30, 25, 50, 30, 30, 30, 20, 15, 16, 25, 32, 15];

const ITEM_GENERATORS = [
  null,
  (seed) => genL1Items(seed, 30),
  (seed) => genL2Items(seed, 25),
  (seed) => genL3Items(seed, 50),
  (seed) => genL4Items(seed, 30),
  (seed) => genL5Items(seed, 30),
  (seed) => genL6Items(seed, 30),
  (seed) => genL7Items(seed, 20),
  (seed) => genL8Items(seed),
  (seed) => genL9Items(seed),
  (seed) => genL10Items(seed, 25),
  (seed) => genL11Items(seed),
  (seed) => genL12Items(seed),
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function generate(level, seed) {
  if (level < 1 || level > 12) throw new Error(`Level must be 1-12, got ${level}`);
  const cfg = LEVEL_CONFIG[level];
  const items = ITEM_GENERATORS[level](seed);
  const writingPrompt = getWritingPrompt(level, seed);
  return {
    level,
    sct_seconds: cfg.sct,
    items,
    writingPrompt,
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
    const expected = EXPECTED_COUNTS[lvl];
    if (result.items.length !== expected) {
      throw new Error(`L${lvl}: expected ${expected} items, got ${result.items.length}`);
    }
    if (result.sct_seconds !== LEVEL_CONFIG[lvl].sct) {
      throw new Error(`L${lvl}: wrong SCT`);
    }
    if (!result.writingPrompt || !result.writingPrompt.text) {
      throw new Error(`L${lvl}: missing writing prompt`);
    }
  }
  return generate(5, seed);
}

if (typeof process !== 'undefined' && process.argv[1] && process.argv[1].endsWith('kumon-reading.js')) {
  const mockSeed = { next: () => 0.42, nextInt: (a,b) => Math.floor((b-a+1)*0.42)+a, pick: (arr) => arr[Math.floor(arr.length*0.42)], shuffle: (arr) => [...arr] };
  const result = smokeTest(mockSeed);
  console.log(`Level ${result.level}, SCT ${result.sct_seconds}s, ${result.items.length} items`);
  console.log('Writing:', JSON.stringify(result.writingPrompt));
  console.log('Sample item:', JSON.stringify(result.items[0]));
}
