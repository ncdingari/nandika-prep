// lib/skills-calendar.js
// 60-day skills calendar for NandikaPrep (CogAT Level 8, rising 2nd grade)

export const SKILLS_CALENDAR = [
  // Week 1: Verbal foundations
  { day: 1, theme: "verbal", skill: "Opposite Relationships", description: "Find the word that means the opposite, like hot and cold or fast and slow." },
  { day: 2, theme: "verbal", skill: "Word Families", description: "Group words that belong together by meaning, like fruits or animals." },
  { day: 3, theme: "quantitative", skill: "Counting by 2s", description: "Practice skip-counting by twos to see number patterns grow." },
  { day: 4, theme: "nonverbal", skill: "Basic Shape Sorting", description: "Sort circles, squares, and triangles by their properties." },
  { day: 5, theme: "nonverbal", skill: "Shape Symmetry", description: "Identify shapes that look the same on both sides when folded." },
  { day: 6, theme: "verbal", skill: "Category Members", description: "Pick the word that fits a category, like animals that can fly." },
  { day: 7, theme: "quantitative", skill: "More and Fewer", description: "Compare sets and decide which has more or fewer objects." },

  // Week 2: Building analogies
  { day: 8, theme: "verbal", skill: "Simple Word Analogies", description: "Complete patterns like 'puppy is to dog as kitten is to ___'." },
  { day: 9, theme: "quantitative", skill: "Counting by 5s", description: "Skip-count by fives and notice how fast numbers jump." },
  { day: 10, theme: "nonverbal", skill: "Pattern Completion", description: "Look at a row of shapes and decide what comes next in the pattern." },
  { day: 11, theme: "verbal", skill: "Size Relationships", description: "Order objects from smallest to largest using describing words." },
  { day: 12, theme: "quantitative", skill: "Adding to 10", description: "Practice all the ways to make the number 10 with two numbers." },
  { day: 13, theme: "nonverbal", skill: "Rotating Shapes", description: "Decide if a shape is the same when it is turned around." },
  { day: 14, theme: "verbal", skill: "Part and Whole", description: "Recognize that a finger is part of a hand, and a petal is part of a flower." },

  // Week 3: Quantitative patterns
  { day: 15, theme: "quantitative", skill: "Number Patterns (Add)", description: "Find the rule in a row of numbers where each one grows by the same amount." },
  { day: 16, theme: "verbal", skill: "Action Word Analogies", description: "Complete analogies using action words: 'fish swims as bird ___'." },
  { day: 17, theme: "nonverbal", skill: "Figure Classification", description: "Find the figure that belongs with a group of similar figures." },
  { day: 18, theme: "quantitative", skill: "Counting by 10s", description: "Skip-count by tens and connect it to place value." },
  { day: 19, theme: "verbal", skill: "Describing Word Analogies", description: "Use adjectives to complete patterns: 'ice is cold as fire is ___'." },
  { day: 20, theme: "nonverbal", skill: "Odd One Out (Shapes)", description: "Find the one shape in a group that does not belong with the others." },
  { day: 21, theme: "quantitative", skill: "Missing Number in a Row", description: "Find which number is missing from a counting sequence." },

  // Week 4: Spatial and visual
  { day: 22, theme: "nonverbal", skill: "Paper Folding Basics", description: "Imagine folding a piece of paper in half and picture where a hole would land." },
  { day: 23, theme: "verbal", skill: "Living vs. Nonliving", description: "Sort words into living things and nonliving things." },
  { day: 24, theme: "quantitative", skill: "Number Puzzles (Balance)", description: "Figure out what number makes both sides of a simple balance equal." },
  { day: 25, theme: "nonverbal", skill: "Mirror Images", description: "Identify the correct mirror image of a figure flipped left to right." },
  { day: 26, theme: "verbal", skill: "Sentence Completion Basics", description: "Choose the best word to finish a sentence so it makes sense." },
  { day: 27, theme: "quantitative", skill: "Subtracting from 10", description: "Practice all the ways to take away from 10 and find what is left." },
  { day: 28, theme: "nonverbal", skill: "Two-Step Patterns", description: "Find the rule in a pattern that changes in two ways, like color and size." },

  // Week 5: Sentence reasoning
  { day: 29, theme: "verbal", skill: "Sentence Logic", description: "Read a short sentence and pick the word that makes it true and sensible." },
  { day: 30, theme: "quantitative", skill: "Number Patterns (Skip)", description: "Find the rule in sequences that skip by 3s or 4s." },
  { day: 31, theme: "nonverbal", skill: "Figure Matrices Intro", description: "Fill in a 2x2 grid of shapes by finding how they change across rows and columns." },
  { day: 32, theme: "verbal", skill: "Time Order Words", description: "Use words like first, then, and last to put events in order." },
  { day: 33, theme: "quantitative", skill: "Adding to 20", description: "Extend addition facts beyond 10 using number patterns." },
  { day: 34, theme: "nonverbal", skill: "Shape Inside Shape", description: "Notice when one shape is nested inside another and find the matching pair." },
  { day: 35, theme: "verbal", skill: "Function Analogies", description: "Match objects to what they do: 'pencil is to write as scissors is to ___'." },

  // Week 6: Deeper quantitative
  { day: 36, theme: "quantitative", skill: "Comparing Numbers to 100", description: "Use greater than and less than to order two-digit numbers." },
  { day: 37, theme: "verbal", skill: "Feelings and Context", description: "Pick the word that best describes how someone would feel in a story." },
  { day: 38, theme: "nonverbal", skill: "Paper Folding with Two Folds", description: "Visualize where a hole lands after a paper is folded twice and punched." },
  { day: 39, theme: "quantitative", skill: "Odd and Even Patterns", description: "Recognize which numbers are odd and which are even up to 30." },
  { day: 40, theme: "verbal", skill: "Object to Place Analogies", description: "Complete patterns like 'book is to library as painting is to ___'." },
  { day: 41, theme: "nonverbal", skill: "Rotating Figures in a Matrix", description: "Track how a figure rotates as you move across a 2x2 matrix." },
  { day: 42, theme: "quantitative", skill: "Number Puzzles (Find the Rule)", description: "Discover the rule that connects pairs of numbers in a table." },

  // Week 7: Advanced verbal
  { day: 43, theme: "verbal", skill: "Sentence Completion with Context Clues", description: "Use the rest of the sentence as a clue to find the missing word." },
  { day: 44, theme: "nonverbal", skill: "Combining Shapes", description: "Predict what shape is formed when two pieces are put together." },
  { day: 45, theme: "quantitative", skill: "Number Series with Two Rules", description: "Find a series that follows two alternating rules, like plus 2 and minus 1." },
  { day: 46, theme: "verbal", skill: "Degree Analogies", description: "Order words by degree: warm, hot, and scorching show increasing heat." },
  { day: 47, theme: "nonverbal", skill: "Picture Classification (Detail)", description: "Group detailed pictures by a shared hidden feature, not just obvious looks." },
  { day: 48, theme: "quantitative", skill: "Multiplication Skip Patterns", description: "Use skip-counting by 2s, 5s, and 10s to build early multiplication ideas." },

  // Week 8: Integration and challenge
  { day: 49, theme: "verbal", skill: "Synonym Analogies", description: "Use similar-meaning words to complete more advanced analogies." },
  { day: 50, theme: "nonverbal", skill: "Figure Matrices (3x3 Grid)", description: "Fill in the missing piece of a 3x3 grid where rows and columns each follow a rule." },
  { day: 51, theme: "quantitative", skill: "Number Puzzles (Two Operations)", description: "Solve number puzzles that require using both addition and subtraction." },
  { day: 52, theme: "verbal", skill: "Category Exclusion", description: "Identify the one word that does not belong in a group and explain why." },
  { day: 53, theme: "nonverbal", skill: "Advanced Paper Folding", description: "Predict hole placement after diagonal folds and corner folds." },
  { day: 54, theme: "quantitative", skill: "Growing Number Patterns", description: "Identify patterns where each step grows by an increasing amount." },

  // Week 9: Review and speed
  { day: 55, theme: "verbal", skill: "Mixed Sentence Completion", description: "Practice a variety of sentence completion types at a slightly faster pace." },
  { day: 56, theme: "quantitative", skill: "Number Series Review", description: "Revisit all number series skills: adding, skipping, and two-rule patterns." },
  { day: 57, theme: "nonverbal", skill: "Mixed Figure Classification", description: "Sort figures using multiple hidden rules combined." },
  { day: 58, theme: "verbal", skill: "Picture Analogies Review", description: "Practice picture-based analogies covering all relationship types learned." },
  { day: 59, theme: "quantitative", skill: "Mixed Number Puzzles", description: "Tackle a variety of number puzzle types in one session." },
  { day: 60, theme: "nonverbal", skill: "Full Nonverbal Review", description: "Bring together figure matrices, paper folding, and classification in a final review." },
];

/**
 * getSkillForDay returns the skill object for a given day number (1-60).
 * Returns undefined if the day is out of range.
 *
 * @param {number} day
 * @returns {{ day: number, theme: string, skill: string, description: string } | undefined}
 */
export function getSkillForDay(day) {
  return SKILLS_CALENDAR.find((entry) => entry.day === day);
}
