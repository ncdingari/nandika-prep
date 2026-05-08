// lib/grader.js
// Grading, level adjustment, and progress tracking for NandikaPrep

/**
 * gradeWorksheet scores a set of questions against a map of chosen answers.
 *
 * @param {Array<{id: string, correctAnswer: string, [key: string]: any}>} questions
 * @param {Map<string, string>} answers - Map of questionId to chosen letter ("A"|"B"|"C"|"D")
 * @returns {{
 *   score: number,
 *   total: number,
 *   percentage: number,
 *   results: Array<{questionId: string, correct: string, chosen: string|null, isCorrect: boolean}>,
 *   wrongQuestions: Array<object>
 * }}
 */
export function gradeWorksheet(questions, answers) {
  const results = [];
  const wrongQuestions = [];
  let score = 0;

  for (const q of questions) {
    const chosen = answers.get(q.id) ?? null;
    const correct = q.correctAnswer;
    const isCorrect = chosen !== null && chosen === correct;

    results.push({
      questionId: q.id,
      correct,
      chosen,
      isCorrect,
    });

    if (isCorrect) {
      score++;
    } else {
      wrongQuestions.push(q);
    }
  }

  const total = questions.length;
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

  return { score, total, percentage, results, wrongQuestions };
}

/**
 * adjustLevel returns a new difficulty level given a current level and percentage score.
 * 90% or above: move up 1. Below 60%: move down 1. Otherwise hold.
 * Clamps result to [1, 10].
 *
 * @param {number} currentLevel
 * @param {number} percentage - integer 0-100
 * @returns {number}
 */
export function adjustLevel(currentLevel, percentage) {
  let next = currentLevel;
  if (percentage >= 90) {
    next = currentLevel + 1;
  } else if (percentage < 60) {
    next = currentLevel - 1;
  }
  return Math.min(10, Math.max(1, next));
}

/**
 * updateProgressFromResults mutates the state object to incorporate day results.
 *
 * dayResults shape:
 * {
 *   date: string (ISO),
 *   day: number,
 *   subtestResults: { [subtestName]: { percentage: number, score: number, total: number } }
 * }
 *
 * @param {object} state
 * @param {object} dayResults
 */
export function updateProgressFromResults(state, dayResults) {
  const { date, day, subtestResults } = dayResults;

  // Update levels for each subtest that appeared today
  for (const [subtestName, result] of Object.entries(subtestResults)) {
    if (subtestName in state.levelsBySubtest) {
      const currentLevel = state.levelsBySubtest[subtestName];
      state.levelsBySubtest[subtestName] = adjustLevel(
        currentLevel,
        result.percentage
      );
    }
  }

  // Count total questions answered today
  let todayTotal = 0;
  for (const result of Object.values(subtestResults)) {
    todayTotal += result.total ?? 0;
  }
  state.totalQuestionsAnswered = (state.totalQuestionsAnswered ?? 0) + todayTotal;

  // Update streak: if the last history entry is from the previous calendar day, increment.
  // Otherwise reset to 1 (today counts).
  const lastEntry = state.history.length > 0 ? state.history[state.history.length - 1] : null;
  if (lastEntry) {
    const lastDate = new Date(lastEntry.date);
    const todayDate = new Date(date);
    const diffMs = todayDate - lastDate;
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      state.streak = (state.streak ?? 0) + 1;
    } else if (diffDays > 1) {
      state.streak = 1;
    }
    // diffDays === 0 means same day, no streak change
  } else {
    state.streak = 1;
  }

  // Append to history
  state.history.push({
    date,
    day,
    subtestResults,
    totalAnswered: todayTotal,
    levelsBySubtest: Object.assign({}, state.levelsBySubtest),
  });

  // Advance currentDay if this day matches or exceeds it
  if (day >= state.currentDay) {
    state.currentDay = day + 1;
  }
}
