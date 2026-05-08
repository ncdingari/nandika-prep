// lib/encouragement.js
// Encouragement messages and static explanations for NandikaPrep

/**
 * CHEERS is a collection of short cheer strings mixing English and Telugu (Roman transliteration).
 * Used for correct answers and general motivation.
 */
export const CHEERS = [
  "Yes! You spotted the pattern.",
  "Beautiful work, your brain is on fire today.",
  "Shabaash Nandika! (Well done!)",
  "Chala bagundi! On to the next one. (Very good!)",
  "That is exactly right, you are getting faster.",
  "Superstar thinking!",
  "Bhale bhale, Nandika! (Excellent, Nandika!)",
  "Inka munduku! You are on a roll. (Keep going forward!)",
  "Mee ammayi chala telivaina! (This girl is so smart!)",
  "You figured it out all by yourself!",
  "Wow, your eyes caught every little detail.",
  "That was a tricky one and you nailed it.",
  "Fantastic reasoning right there.",
  "Chala bagundi, oka more! (Very good, one more!)",
  "Your brain made a great connection just now.",
  "Look at you go! Nothing can stop you.",
  "Shabaash! That is the right answer.",
  "You are thinking like a real puzzle solver.",
  "Bhale bhale! Keep that energy going.",
  "Perfect answer, Nandika. Really perfect.",
  "You saw the rule right away. Amazing.",
  "Inka munduku, you are so close to the finish!",
  "That one was hard and you still got it right.",
  "Great job staying focused on the details.",
  "Mee ammayi super star! (This girl is a superstar!)",
  "You are making your brain stronger with every answer.",
  "Wonderful thinking. Exactly right.",
  "Chala bagundi! Each day you get better.",
  "Shabaash! That logic was spot on.",
  "You should be so proud of yourself right now.",
  "Bhale bhale, that was fast thinking!",
  "Every question you answer is practice for your big test.",
  "You are unstoppable today, keep it up!",
];

/**
 * WRONG_INTRO is used as a gentle opener when reviewing a missed question.
 */
export const WRONG_INTRO = "Let's look at this one together.";

/**
 * getCheer returns a random cheer string from the CHEERS array.
 * @returns {string}
 */
export function getCheer() {
  const index = Math.floor(Math.random() * CHEERS.length);
  return CHEERS[index];
}

/**
 * staticExplain returns a short, age-appropriate explanation (2-3 sentences)
 * for a question that was answered. Never uses the words "wrong" or "incorrect".
 *
 * @param {{ skill?: string, explanation?: string, correctAnswer?: string }} question
 * @returns {string}
 */
export function staticExplain(question) {
  const { skill = "", explanation = "", correctAnswer = "" } = question ?? {};

  const intro = WRONG_INTRO + " ";

  // If the question has its own explanation field, use it as the base.
  if (explanation && explanation.trim().length > 0) {
    const base = explanation.trim();
    // If the generator already prefixed with WRONG_INTRO, don't double-prefix.
    if (base.startsWith(WRONG_INTRO)) return base;
    return intro + base;
  }

  // Fall back to skill-based explanations
  const s = skill.toLowerCase();

  if (s.includes("opposite") || s.includes("antonym")) {
    return (
      intro +
      "Opposites are words that mean something very different from each other." +
      " Think about pairs you already know, like big and small or happy and sad." +
      (correctAnswer ? " The answer here is " + correctAnswer + "." : "")
    );
  }

  if (s.includes("analogy") || s.includes("analogies")) {
    return (
      intro +
      "An analogy shows how two things go together, then asks you to find the same kind of match." +
      " Look at the first pair carefully and find what connects them." +
      (correctAnswer ? " The best match here is " + correctAnswer + "." : "")
    );
  }

  if (s.includes("classification") || s.includes("category") || s.includes("odd one out")) {
    return (
      intro +
      "Classification means finding things that share something in common." +
      " Look at each choice and ask yourself whether it fits the same group as the others." +
      (correctAnswer ? " The one that fits best is " + correctAnswer + "." : "")
    );
  }

  if (s.includes("sentence") || s.includes("completion")) {
    return (
      intro +
      "When you complete a sentence, you look for the word that makes the whole sentence make sense." +
      " Read it slowly and listen to whether it sounds right." +
      (correctAnswer ? " The word that fits best is " + correctAnswer + "." : "")
    );
  }

  if (s.includes("number") || s.includes("series") || s.includes("pattern")) {
    return (
      intro +
      "Number patterns have a secret rule, like adding the same amount each time." +
      " Try counting forward or backward to find what comes next." +
      (correctAnswer ? " The missing number is " + correctAnswer + "." : "")
    );
  }

  if (s.includes("paper fold")) {
    return (
      intro +
      "Paper folding questions ask you to imagine a piece of paper being folded." +
      " Picture where the two sides meet, then find where a hole or mark would appear when it is unfolded." +
      (correctAnswer ? " The right picture is " + correctAnswer + "." : "")
    );
  }

  if (s.includes("matri") || s.includes("grid")) {
    return (
      intro +
      "A figure matrix is like a puzzle grid where the shapes follow a rule across every row and column." +
      " Look at what changes from left to right and from top to bottom." +
      (correctAnswer ? " The missing piece is " + correctAnswer + "." : "")
    );
  }

  if (s.includes("symmetr")) {
    return (
      intro +
      "Symmetry means a shape looks the same on both sides of an imaginary fold line." +
      " Try folding the picture in your mind to see if both sides match." +
      (correctAnswer ? " The symmetric shape is " + correctAnswer + "." : "")
    );
  }

  // Generic fallback
  return (
    intro +
    "Take a close look at the choices and think about the rule that connects them." +
    " Sometimes slowing down and looking at each detail helps the answer stand out." +
    (correctAnswer ? " The best answer here is " + correctAnswer + "." : "")
  );
}
