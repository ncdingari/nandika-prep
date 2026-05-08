// lib/kumon-mastery.js
// Mastery gating for Kumon drills. Separate from CogAT level adjuster in lib/grader.js.
// Kumon levels clamp to [1, 12]. Advance after 2 consecutive perfect days; drop after 3 struggling days.

const KUMON_MIN_LEVEL = 1;
const KUMON_MAX_LEVEL = 12;
const ADVANCE_THRESHOLD = 2;  // consecutive perfect days needed to advance
const DROP_THRESHOLD = 3;     // consecutive struggling days needed to drop

/**
 * Determines whether a drill result counts as a "perfect day".
 * Perfect = accuracy >= 100% AND completed within SCT (standard completion time).
 *
 * @param {{ accuracy: number, timeSeconds: number, sctSeconds: number }} drillResult
 * @returns {boolean}
 */
function isPerfectDay(drillResult) {
  return drillResult.accuracy >= 100 && drillResult.timeSeconds <= drillResult.sctSeconds;
}

/**
 * Determines whether a drill result counts as a "struggling day".
 * Struggling = accuracy < 80% OR took more than 1.5x the SCT.
 *
 * @param {{ accuracy: number, timeSeconds: number, sctSeconds: number }} drillResult
 * @returns {boolean}
 */
function isStrugglingDay(drillResult) {
  return drillResult.accuracy < 80 || drillResult.timeSeconds > drillResult.sctSeconds * 1.5;
}

/**
 * Evaluates a completed drill result against the current Kumon sub-state and returns
 * the new streak counts, whether it was a perfect day, and what level action to take.
 *
 * @param {{ level: number, perfectStreak: number, strugglingStreak: number, history: Array }} kumonSubState
 * @param {{ date: string, level: number, accuracy: number, timeSeconds: number, sctSeconds: number }} drillResult
 * @returns {{ newLevel: number, newPerfectStreak: number, newStrugglingStreak: number, perfectDay: boolean, action: "advance"|"drop"|"hold" }}
 */
export function evaluateMasteryAfterDrill(kumonSubState, drillResult) {
  const { level, perfectStreak, strugglingStreak } = kumonSubState;

  const perfect = isPerfectDay(drillResult);
  const struggling = !perfect && isStrugglingDay(drillResult);

  let newPerfectStreak = perfectStreak;
  let newStrugglingStreak = strugglingStreak;

  if (perfect) {
    newPerfectStreak = perfectStreak + 1;
    newStrugglingStreak = 0;
  } else if (struggling) {
    newStrugglingStreak = strugglingStreak + 1;
    newPerfectStreak = 0;
  }
  // else: neutral day, both streaks unchanged

  let action = "hold";
  let newLevel = level;

  if (newPerfectStreak >= ADVANCE_THRESHOLD) {
    action = "advance";
    newLevel = Math.min(KUMON_MAX_LEVEL, level + 1);
    newPerfectStreak = 0;
  } else if (newStrugglingStreak >= DROP_THRESHOLD) {
    action = "drop";
    newLevel = Math.max(KUMON_MIN_LEVEL, level - 1);
    newStrugglingStreak = 0;
  }

  return {
    newLevel,
    newPerfectStreak,
    newStrugglingStreak,
    perfectDay: perfect,
    action,
  };
}

/**
 * Returns a summary of the current mastery status for display.
 *
 * @param {{ level: number, perfectStreak: number, strugglingStreak: number }} kumonSubState
 * @returns {{ level: number, perfectStreak: number, strugglingStreak: number, nextLevelAt: number, displayDots: string }}
 */
export function getMasteryStatus(kumonSubState) {
  const { level, perfectStreak, strugglingStreak } = kumonSubState;
  const displayDots =
    perfectStreak === 1
      ? "1 of 2 perfect days"
      : `${perfectStreak} of 2 perfect days`;

  return {
    level,
    perfectStreak,
    strugglingStreak,
    nextLevelAt: ADVANCE_THRESHOLD,
    displayDots,
  };
}

/**
 * Returns true if the sub-state has accumulated enough perfect days to advance.
 *
 * @param {{ perfectStreak: number }} kumonSubState
 * @returns {boolean}
 */
export function shouldAdvanceLevel(kumonSubState) {
  return kumonSubState.perfectStreak >= ADVANCE_THRESHOLD;
}

/**
 * Returns true if the sub-state has accumulated enough struggling days to drop.
 *
 * @param {{ strugglingStreak: number }} kumonSubState
 * @returns {boolean}
 */
export function shouldDropLevel(kumonSubState) {
  return kumonSubState.strugglingStreak >= DROP_THRESHOLD;
}

/**
 * Mutates kumonSubState by applying the evaluation result: updates level, streaks,
 * and appends the drill result to history.
 *
 * @param {{ level: number, perfectStreak: number, strugglingStreak: number, history: Array }} kumonSubState
 * @param {{ newLevel: number, newPerfectStreak: number, newStrugglingStreak: number, perfectDay: boolean, action: string }} evaluation
 * @returns {object} the mutated kumonSubState
 */
export function applyMasteryResult(kumonSubState, evaluation) {
  const { newLevel, newPerfectStreak, newStrugglingStreak } = evaluation;

  kumonSubState.level = newLevel;
  kumonSubState.perfectStreak = newPerfectStreak;
  kumonSubState.strugglingStreak = newStrugglingStreak;

  kumonSubState.history.push({
    date: evaluation.date ?? new Date().toISOString().slice(0, 10),
    level: evaluation.newLevel,
    perfectDay: evaluation.perfectDay,
    action: evaluation.action,
  });

  return kumonSubState;
}
