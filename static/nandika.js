// NandikaPrep client helpers: read-aloud, confetti, HTML updates.

// Load canvas-confetti from CDN
(function () {
  if (typeof confetti === "undefined") {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js";
    document.head.appendChild(s);
  }
})();

// Custom message handler: update any element's innerHTML
Shiny.addCustomMessageHandler("update_html", function (msg) {
  const el = document.getElementById(msg.id);
  if (el) {
    el.innerHTML = msg.html;
    // Execute any inline scripts in the new HTML
    el.querySelectorAll("script").forEach((src) => {
      const s = document.createElement("script");
      s.textContent = src.textContent;
      document.body.appendChild(s);
      document.body.removeChild(s);
    });
  }
});

// Custom message handler: read aloud via Web Speech API
Shiny.addCustomMessageHandler("read_aloud", function (msg) {
  if (!window.speechSynthesis) return;
  const utter = new SpeechSynthesisUtterance(msg.text || "");
  utter.rate = msg.rate || 1.0;
  utter.lang = msg.lang || "en-US";
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
});

// Custom message handler: confetti celebration
Shiny.addCustomMessageHandler("confetti", function (msg) {
  if (typeof confetti === "function") {
    confetti({
      particleCount: msg.count || 120,
      spread: 70,
      origin: { y: 0.6 },
    });
  }
});

// Custom message handler: scroll to top
Shiny.addCustomMessageHandler("scroll_top", function () {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// Custom message handler: set a session cookie
Shiny.addCustomMessageHandler("set_session_cookie", function (msg) {
  const d = new Date();
  d.setTime(d.getTime() + (msg.days || 365) * 24 * 60 * 60 * 1000);
  document.cookie = msg.name + "=" + msg.value + ";expires=" + d.toUTCString() + ";path=/;SameSite=Lax";
});

// Energy choice persistence (12 hours)
const ENERGY_KEY = "nandika_energy_choice";
Shiny.addCustomMessageHandler("set_energy_choice", function (msg) {
  const payload = { value: msg.value, ts: Date.now() };
  localStorage.setItem(ENERGY_KEY, JSON.stringify(payload));
});

Shiny.addCustomMessageHandler("get_energy_choice", function (msg) {
  const raw = localStorage.getItem(ENERGY_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    const age = Date.now() - (parsed.ts || 0);
    if (age > 12 * 60 * 60 * 1000) {
      localStorage.removeItem(ENERGY_KEY);
      return;
    }
    Shiny.setInputValue(msg.input_id, parsed.value, { priority: "event" });
  } catch (e) {
    localStorage.removeItem(ENERGY_KEY);
  }
});
