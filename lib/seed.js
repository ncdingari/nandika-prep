// lib/seed.js
// Mulberry32 PRNG and seeded random utilities

/**
 * mulberry32(seed) returns a PRNG function that produces floats in [0, 1) each call.
 * @param {number} seed
 * @returns {() => number}
 */
export function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * dateToSeed converts "YYYY-MM-DD" to an integer seed.
 * @param {string} dateStr
 * @returns {number}
 */
export function dateToSeed(dateStr) {
  // Strip dashes and parse as integer, e.g. "2025-06-01" -> 20250601
  const digits = dateStr.replace(/-/g, "");
  return parseInt(digits, 10) >>> 0;
}

/**
 * SeededRandom wraps mulberry32 with convenience methods.
 */
export class SeededRandom {
  /**
   * @param {number} seed
   */
  constructor(seed) {
    this._rng = mulberry32(seed >>> 0);
  }

  /** Returns a float in [0, 1). */
  next() {
    return this._rng();
  }

  /**
   * Returns an integer in [min, max] inclusive.
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  nextInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return min + Math.floor(this._rng() * (max - min + 1));
  }

  /**
   * Picks a random element from an array.
   * @template T
   * @param {T[]} array
   * @returns {T}
   */
  pick(array) {
    if (!array || array.length === 0) return undefined;
    return array[this.nextInt(0, array.length - 1)];
  }

  /**
   * Returns a new array that is a shuffled copy of the input (Fisher-Yates).
   * @template T
   * @param {T[]} array
   * @returns {T[]}
   */
  shuffle(array) {
    const arr = array.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
