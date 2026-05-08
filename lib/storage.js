// lib/storage.js
// localStorage wrapper for NandikaPrep state

const STORAGE_KEY = "nandikaPrep_state";

const DEFAULT_STATE = {
  studentName: "Nandika",
  startDate: new Date().toISOString(),
  currentDay: 1,
  streak: 0,
  totalQuestionsAnswered: 0,
  levelsBySubtest: {
    "picture-analogies": 3,
    "sentence-completion": 3,
    "picture-classification": 3,
    "number-analogies": 3,
    "number-puzzles": 3,
    "number-series": 3,
    "figure-matrices": 3,
    "paper-folding": 3,
    "figure-classification": 3,
  },
  history: [],
  apiKeys: { deepseek: null, anthropic: null },
  providerStats: {
    deepseekSuccess: 0,
    deepseekFail: 0,
    anthropicSuccess: 0,
    anthropicFail: 0,
    visionCalls: 0,
    offlineFallback: 0,
  },
  skillsCompleted: [],
};

/**
 * Deep-merges src into target (plain objects only, not arrays).
 * Arrays and primitives from defaults are kept if missing in loaded state.
 */
function deepMerge(target, src) {
  const result = Object.assign({}, target);
  for (const key of Object.keys(src)) {
    if (
      src[key] !== null &&
      typeof src[key] === "object" &&
      !Array.isArray(src[key]) &&
      key in result &&
      typeof result[key] === "object" &&
      result[key] !== null &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(result[key], src[key]);
    } else {
      result[key] = src[key];
    }
  }
  return result;
}

/**
 * loadState returns the current state merged with defaults for any missing keys.
 * @returns {object}
 */
export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const parsed = JSON.parse(raw);
    return deepMerge(structuredClone(DEFAULT_STATE), parsed);
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

/**
 * saveState writes the full state to localStorage.
 * @param {object} state
 */
export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/**
 * updateState merges a partial patch into the current state and saves.
 * @param {object} patch
 * @returns {object} the new state
 */
export function updateState(patch) {
  const current = loadState();
  const next = deepMerge(current, patch);
  saveState(next);
  return next;
}

/**
 * resetState clears the stored state and re-initializes with defaults.
 * @returns {object} the fresh default state
 */
export function resetState() {
  localStorage.removeItem(STORAGE_KEY);
  const fresh = structuredClone(DEFAULT_STATE);
  fresh.startDate = new Date().toISOString();
  saveState(fresh);
  return fresh;
}

/**
 * exportJSON returns the current state as a JSON string.
 * @returns {string}
 */
export function exportJSON() {
  const state = loadState();
  return JSON.stringify(state, null, 2);
}

/**
 * importJSON parses a JSON string and saves it as the new state.
 * Throws if the string is invalid JSON.
 * @param {string} str
 * @returns {object} the imported state
 */
export function importJSON(str) {
  let parsed;
  try {
    parsed = JSON.parse(str);
  } catch (e) {
    throw new Error("Invalid JSON: " + e.message);
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Invalid state: expected an object.");
  }
  const merged = deepMerge(structuredClone(DEFAULT_STATE), parsed);
  saveState(merged);
  return merged;
}
