// lib/ai.js
// Unified AI router for NandikaPrep. Routes between DeepSeek and Anthropic Claude.

import { loadState, updateState } from "./storage.js";

const DEEPSEEK_ENDPOINT = "https://api.deepseek.com/chat/completions";
const DEEPSEEK_MODEL = "deepseek-chat";

const ANTHROPIC_ENDPOINT = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_MODEL = "claude-sonnet-4-20250514";
const ANTHROPIC_VERSION = "2023-06-01";

const DEEPSEEK_TIMEOUT_MS = 20000;

// Module-level variable tracking the last successful provider
let lastProvider = null;

/**
 * Wraps fetch with a timeout. Returns the response or throws on timeout/error.
 * @param {string} url
 * @param {RequestInit} options
 * @param {number} timeoutMs
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Calls DeepSeek chat completions API (OpenAI format).
 * @param {string} apiKey
 * @param {string} system
 * @param {string} user
 * @param {boolean} json
 * @returns {Promise<string|null>}
 */
async function callDeepSeek(apiKey, system, user, json) {
  const messages = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: user });

  const body = {
    model: DEEPSEEK_MODEL,
    messages,
  };
  if (json) {
    body.response_format = { type: "json_object" };
  }

  const res = await fetchWithTimeout(
    DEEPSEEK_ENDPOINT,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
      },
      body: JSON.stringify(body),
    },
    DEEPSEEK_TIMEOUT_MS
  );

  if (!res.ok) {
    throw new Error("DeepSeek HTTP " + res.status);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? null;
}

/**
 * Builds Anthropic message content from text, image, and pdf params.
 * @param {string} user
 * @param {string|null} image - base64 data URL
 * @param {string|null} pdf - base64 data URL
 * @returns {Array}
 */
function buildAnthropicContent(user, image, pdf) {
  const content = [];

  if (image) {
    // image is expected as a data URL: "data:<mediaType>;base64,<data>"
    const match = image.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: match[1],
          data: match[2],
        },
      });
    }
  }

  if (pdf) {
    const match = pdf.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      content.push({
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: match[2],
        },
      });
    }
  }

  if (user) {
    content.push({ type: "text", text: user });
  }

  return content;
}

/**
 * Calls Anthropic Claude API.
 * @param {string} apiKey
 * @param {string} system
 * @param {string} user
 * @param {boolean} json
 * @param {string|null} image
 * @param {string|null} pdf
 * @returns {Promise<string|null>}
 */
async function callAnthropic(apiKey, system, user, json, image, pdf) {
  const content = buildAnthropicContent(user, image, pdf);

  const body = {
    model: ANTHROPIC_MODEL,
    max_tokens: 2048,
    messages: [{ role: "user", content }],
  };

  if (system) {
    body.system = system;
  }

  const res = await fetch(ANTHROPIC_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error("Anthropic HTTP " + res.status);
  }

  const data = await res.json();
  const text = data?.content?.[0]?.text ?? null;
  return text;
}

/**
 * callAI is the unified AI router.
 *
 * @param {object} params
 * @param {string} [params.task] - Optional task label for logging
 * @param {string} [params.system] - System prompt
 * @param {string} [params.user] - User message
 * @param {boolean} [params.json] - If true, parse response as JSON
 * @param {string|null} [params.image] - Base64 data URL for vision
 * @param {string|null} [params.pdf] - Base64 data URL for PDF vision
 * @returns {Promise<string|object|null>}
 */
export async function callAI({ task, system = "", user = "", json = false, image = null, pdf = null } = {}) {
  const state = loadState();
  const { deepseek: deepseekKey, anthropic: anthropicKey } = state.apiKeys ?? {};

  // Vision path: Claude only
  if (image || pdf) {
    if (!anthropicKey) {
      return { error: "Vision unavailable, please retry or enter answers manually." };
    }
    try {
      updateState({ providerStats: { ...state.providerStats, visionCalls: (state.providerStats.visionCalls ?? 0) + 1 } });
      const text = await callAnthropic(anthropicKey, system, user, json, image, pdf);
      updateState({
        providerStats: {
          ...(loadState().providerStats),
          anthropicSuccess: (loadState().providerStats.anthropicSuccess ?? 0) + 1,
        },
      });
      lastProvider = "anthropic";
      if (json && text) {
        try { return JSON.parse(text); } catch { return text; }
      }
      return text;
    } catch {
      updateState({
        providerStats: {
          ...(loadState().providerStats),
          anthropicFail: (loadState().providerStats.anthropicFail ?? 0) + 1,
        },
      });
      lastProvider = null;
      return { error: "Vision unavailable, please retry or enter answers manually." };
    }
  }

  // Text path: DeepSeek first, then Claude fallback
  if (deepseekKey) {
    let attempts = 0;
    while (attempts < 2) {
      attempts++;
      try {
        const text = await callDeepSeek(deepseekKey, system, user, json);
        updateState({
          providerStats: {
            ...(loadState().providerStats),
            deepseekSuccess: (loadState().providerStats.deepseekSuccess ?? 0) + 1,
          },
        });
        lastProvider = "deepseek";
        if (json && text) {
          try { return JSON.parse(text); } catch { return text; }
        }
        return text;
      } catch {
        // retry once more, then fall through to Claude
        if (attempts >= 2) {
          updateState({
            providerStats: {
              ...(loadState().providerStats),
              deepseekFail: (loadState().providerStats.deepseekFail ?? 0) + 1,
            },
          });
        }
      }
    }
  }

  // Claude fallback for text
  if (anthropicKey) {
    try {
      const text = await callAnthropic(anthropicKey, system, user, json, null, null);
      updateState({
        providerStats: {
          ...(loadState().providerStats),
          anthropicSuccess: (loadState().providerStats.anthropicSuccess ?? 0) + 1,
        },
      });
      lastProvider = "anthropic";
      if (json && text) {
        try { return JSON.parse(text); } catch { return text; }
      }
      return text;
    } catch {
      updateState({
        providerStats: {
          ...(loadState().providerStats),
          anthropicFail: (loadState().providerStats.anthropicFail ?? 0) + 1,
        },
      });
    }
  }

  // Both failed
  updateState({
    providerStats: {
      ...(loadState().providerStats),
      offlineFallback: (loadState().providerStats.offlineFallback ?? 0) + 1,
    },
  });
  lastProvider = null;
  return null;
}

/**
 * getProviderBadge returns a display string based on the last provider used.
 * @returns {"Reviewed by DeepSeek"|"Reviewed by Claude"|"Reviewed offline"}
 */
export function getProviderBadge() {
  if (lastProvider === "deepseek") return "Reviewed by DeepSeek";
  if (lastProvider === "anthropic") return "Reviewed by Claude";
  return "Reviewed offline";
}
