// lib/speech.js
// Text-to-speech utilities using the Web Speech API

/**
 * isSupported returns true if window.speechSynthesis is available.
 * @returns {boolean}
 */
export function isSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/**
 * stopSpeech cancels any currently playing or queued utterance.
 */
export function stopSpeech() {
  if (isSupported()) {
    window.speechSynthesis.cancel();
  }
}

/**
 * speak uses the Web Speech API to read aloud the given text.
 *
 * @param {string} text - The text to speak
 * @param {object} [options]
 * @param {number} [options.rate=0.85] - Speech rate (0.1 to 10)
 * @param {number} [options.pitch=1.1] - Pitch (0 to 2)
 * @param {string} [options.lang="en-US"] - BCP-47 language tag
 * @returns {Promise<void>} Resolves when speech ends, rejects on error
 */
export function speak(text, options = {}) {
  return new Promise((resolve, reject) => {
    if (!isSupported()) {
      reject(new Error("speechSynthesis is not supported in this browser."));
      return;
    }

    // Cancel any ongoing speech before starting a new one
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = typeof options.rate === "number" ? options.rate : 0.85;
    utterance.pitch = typeof options.pitch === "number" ? options.pitch : 1.1;
    utterance.lang = typeof options.lang === "string" ? options.lang : "en-US";

    utterance.onend = () => resolve();
    utterance.onerror = (e) => reject(new Error("speechSynthesis error: " + e.error));

    window.speechSynthesis.speak(utterance);
  });
}
