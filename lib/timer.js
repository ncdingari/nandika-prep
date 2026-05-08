// lib/timer.js
// Count-up drill timer with pause/resume support for Kumon drill screens.

/**
 * Formats an integer number of seconds into "M:SS" format.
 * Minutes have no leading zero; seconds always have two digits.
 * Examples: 270 -> "4:30", 65 -> "1:05", 9 -> "0:09"
 *
 * @param {number} seconds - non-negative integer
 * @returns {string}
 */
export function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(s / 60);
  const secs = s % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

/**
 * DrillTimer is a count-up timer that calls onTick(elapsed_seconds) every second.
 * Supports pause/resume by accumulating elapsed milliseconds across intervals.
 */
export class DrillTimer {
  /**
   * @param {(elapsedSeconds: number) => void} onTick - called once per second with total elapsed seconds
   */
  constructor(onTick) {
    this._onTick = onTick;
    this._intervalId = null;
    this._accumulatedMs = 0;
    this._segmentStart = null;  // Date.now() when the current running segment began
    this._running = false;
  }

  /**
   * Starts the timer from zero. If already running, this is a no-op.
   */
  start() {
    if (this._running) return;
    this._accumulatedMs = 0;
    this._segmentStart = Date.now();
    this._running = true;
    this._scheduleInterval();
  }

  /**
   * Pauses the timer. Accumulated time is preserved.
   */
  pause() {
    if (!this._running) return;
    this._accumulatedMs += Date.now() - this._segmentStart;
    this._segmentStart = null;
    this._running = false;
    this._clearInterval();
  }

  /**
   * Resumes the timer from where it was paused.
   */
  resume() {
    if (this._running) return;
    this._segmentStart = Date.now();
    this._running = true;
    this._scheduleInterval();
  }

  /**
   * Stops the timer and returns the total elapsed seconds.
   * @returns {number} elapsed seconds (integer)
   */
  stop() {
    if (this._running) {
      this._accumulatedMs += Date.now() - this._segmentStart;
      this._segmentStart = null;
      this._running = false;
    }
    this._clearInterval();
    return Math.floor(this._accumulatedMs / 1000);
  }

  /**
   * Returns the current elapsed seconds without stopping the timer.
   * @returns {number} elapsed seconds (integer)
   */
  getElapsed() {
    let totalMs = this._accumulatedMs;
    if (this._running && this._segmentStart !== null) {
      totalMs += Date.now() - this._segmentStart;
    }
    return Math.floor(totalMs / 1000);
  }

  /**
   * Returns true if the timer is currently running.
   * @returns {boolean}
   */
  isRunning() {
    return this._running;
  }

  /**
   * Formats a number of seconds into "M:SS" display format.
   * Convenience wrapper around the module-level formatTime export.
   *
   * @param {number} seconds
   * @returns {string}
   */
  formatTime(seconds) {
    return formatTime(seconds);
  }

  // --- internal helpers ---

  _scheduleInterval() {
    this._intervalId = setInterval(() => {
      if (this._onTick) {
        this._onTick(this.getElapsed());
      }
    }, 1000);
  }

  _clearInterval() {
    if (this._intervalId !== null) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  }
}
