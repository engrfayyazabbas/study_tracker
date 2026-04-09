/**
 * mini-timer.js
 * Floating PiP-style mini timer widget.
 * Reads timer state from localStorage (written by timer.js).
 * Shows on every page EXCEPT /timer (which has the full timer).
 * Supports drag-to-move, dismiss per session.
 */

(function () {
  "use strict";

  const STORE_KEY     = "studyTimerState";
  const DISMISSED_KEY = "miniTimerDismissed";
  const CIRC          = 2 * Math.PI * 34; // 213.63 — matches CSS stroke-dasharray

  let miniInterval = null;

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function getState() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)); }
    catch { return null; }
  }

  function fmt(secs) {
    const h = Math.floor(secs / 3600);
    const m = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
    const s = String(secs % 60).padStart(2, "0");
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
  }

  // ── Widget HTML ───────────────────────────────────────────────────────────────
  function createWidget() {
    const el = document.createElement("div");
    el.id = "miniTimer";
    el.innerHTML = `
      <div class="mt-header">
        <span class="mt-subject" id="mtSubject">—</span>
        <div class="mt-actions">
          <a  class="mt-go"    href="/timer" title="Open timer">↗</a>
          <button class="mt-close" id="mtClose" title="Dismiss">✕</button>
        </div>
      </div>
      <div class="mt-body">
        <div class="mt-ring-wrap">
          <svg class="mt-ring" viewBox="0 0 80 80">
            <circle class="mt-ring-bg" cx="40" cy="40" r="34"/>
            <circle class="mt-ring-fg" cx="40" cy="40" r="34" id="mtRingFg"/>
          </svg>
          <div class="mt-time" id="mtTime">--:--</div>
        </div>
        <div class="mt-info">
          <span class="mt-label">Study Timer</span>
          <span class="mt-status" id="mtStatus">
            <span class="mt-pulse"></span>Focus
          </span>
        </div>
      </div>`;
    document.body.appendChild(el);

    // Dismiss
    el.querySelector("#mtClose").addEventListener("click", () => {
      sessionStorage.setItem(DISMISSED_KEY, "1");
      destroyWidget();
    });

    // Drag-to-move
    makeDraggable(el);

    return el;
  }

  function destroyWidget() {
    const el = document.getElementById("miniTimer");
    if (el) {
      el.classList.add("mt-exit");
      setTimeout(() => el.remove(), 300);
    }
    if (miniInterval) { clearInterval(miniInterval); miniInterval = null; }
  }

  // ── Drag ─────────────────────────────────────────────────────────────────────
  function makeDraggable(el) {
    let dragging = false, startX, startY, origLeft, origTop;

    const header = el.querySelector(".mt-header");
    header.style.cursor = "grab";

    header.addEventListener("mousedown", e => {
      if (e.target.closest(".mt-close, .mt-go")) return;
      dragging = true;
      const rect = el.getBoundingClientRect();
      startX   = e.clientX;
      startY   = e.clientY;
      origLeft = rect.left;
      origTop  = rect.top;
      el.classList.add("mt-dragging");
      el.style.right  = "auto";
      el.style.bottom = "auto";
      el.style.left   = origLeft + "px";
      el.style.top    = origTop  + "px";
      e.preventDefault();
    });

    document.addEventListener("mousemove", e => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      el.style.left = Math.max(0, origLeft + dx) + "px";
      el.style.top  = Math.max(0, origTop  + dy) + "px";
    });

    document.addEventListener("mouseup", () => {
      if (!dragging) return;
      dragging = false;
      el.classList.remove("mt-dragging");
      header.style.cursor = "grab";
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  function render(state) {
    const timeEl   = document.getElementById("mtTime");
    const subjEl   = document.getElementById("mtSubject");
    const ringEl   = document.getElementById("mtRingFg");
    const statusEl = document.getElementById("mtStatus");
    const widget   = document.getElementById("miniTimer");
    if (!timeEl || !ringEl) return;

    // Compute live values from wall-clock
    let secondsRan = 0;
    if (state.running && state.intervalRef) {
      secondsRan = Math.floor((Date.now() - state.intervalRef) / 1000);
    }

    let displaySecs, fraction, isDanger;

    if (state.isStopwatch) {
      const elapsed = (state.pausedElapsed || 0) + secondsRan;
      displaySecs   = elapsed;
      fraction      = Math.min(1, elapsed / 7200);
      isDanger      = false;
    } else {
      const remaining = Math.max(0, (state.pausedRemaining || state.totalSeconds) - secondsRan);
      displaySecs     = remaining;
      fraction        = state.totalSeconds > 0 ? remaining / state.totalSeconds : 1;
      isDanger        = remaining <= 60 && state.running;

      // Timer finished while widget was watching — clean up
      if (remaining <= 0 && state.running) {
        localStorage.removeItem(STORE_KEY);
        destroyWidget();
        return;
      }
    }

    // Update DOM
    timeEl.textContent = fmt(displaySecs);
    ringEl.style.strokeDashoffset = CIRC * (1 - fraction);
    subjEl.textContent = state.subjectName || "—";

    // Color
    const color = state.subjectColor || "#c8f060";
    if (!state.paused) {
      ringEl.style.stroke = isDanger ? "" : color;  // danger handled by CSS class
      widget.style.setProperty("--mt-accent", color);
    }

    // Classes
    timeEl.classList.toggle("mt-danger", isDanger);
    ringEl.classList.toggle("mt-danger", isDanger);
    widget.classList.toggle("mt-paused",  !!state.paused);

    // Status text
    const pulse = `<span class="mt-pulse"></span>`;
    statusEl.innerHTML = state.paused   ? "Paused"
                       : isDanger       ? `${pulse}Last minute!`
                                        : `${pulse}Focus`;
  }

  // ── Poll tick ─────────────────────────────────────────────────────────────────
  function tick() {
    const state = getState();
    if (!state || (!state.running && !state.paused)) {
      destroyWidget();
      return;
    }
    render(state);
  }

  // ── Init ──────────────────────────────────────────────────────────────────────
  function init() {
    // Never show the mini widget on the timer page (it has the full timer)
    if (window.location.pathname === "/timer") return;

    // User dismissed it this browser session
    if (sessionStorage.getItem(DISMISSED_KEY)) return;

    const state = getState();
    if (!state || (!state.running && !state.paused)) return;

    // Build widget if not already present
    if (!document.getElementById("miniTimer")) {
      const el = createWidget();
      // init ring dasharray
      const ringEl = el.querySelector(".mt-ring-fg");
      if (ringEl) {
        ringEl.style.strokeDasharray  = String(CIRC);
        ringEl.style.strokeDashoffset = "0";
      }
      // Animate in
      requestAnimationFrame(() => {
        requestAnimationFrame(() => el.classList.add("mt-visible"));
      });
    }

    render(state);
    if (!miniInterval) {
      miniInterval = setInterval(tick, 1000);
    }
  }

  // Re-init when localStorage changes (timer started/paused in another tab)
  window.addEventListener("storage", e => {
    if (e.key === STORE_KEY) {
      if (e.newValue) { init(); }
      else            { destroyWidget(); }
    }
  });

  // Snap when tab regains focus
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) tick();
  });

  // Boot
  document.addEventListener("DOMContentLoaded", init);
})();
