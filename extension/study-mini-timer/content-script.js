(function () {
  "use strict";

  const APP_LOCAL_KEY = "studyTimerState";
  const EXT_STATE_KEY = "studyMiniTimerState";
  const EXT_META_KEY = "studyMiniTimerMeta";
  const EXT_POS_KEY = "studyMiniTimerPosition";
  const DISMISS_KEY = "studyMiniDismissedSession";
  const CIRC = 2 * Math.PI * 34;

  let widget = null;
  let tickInterval = null;

  function isHttpPage() {
    return window.location.protocol === "http:" || window.location.protocol === "https:";
  }

  function readAppLocalState() {
    try {
      const raw = localStorage.getItem(APP_LOCAL_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function fmt(secs) {
    const h = Math.floor(secs / 3600);
    const m = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
    const s = String(secs % 60).padStart(2, "0");
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
  }

  function hasActiveState(state) {
    return !!state && (state.running || state.paused);
  }

  function isTimerPage(meta) {
    if (!meta || !meta.appOrigin) return false;
    return location.origin === meta.appOrigin && location.pathname === "/timer";
  }

  function upsertSharedStateFromApp() {
    if (!isHttpPage()) return;
    if (!window.chrome || !chrome.storage || !chrome.storage.local) return;
    const localState = readAppLocalState();

    if (hasActiveState(localState)) {
      const payload = {
        state: localState,
        updatedAt: Date.now(),
        sourceOrigin: location.origin
      };
      chrome.storage.local.set({
        [EXT_STATE_KEY]: payload,
        [EXT_META_KEY]: { appOrigin: location.origin }
      });
      return;
    }

    chrome.storage.local.get([EXT_META_KEY], result => {
      const meta = result[EXT_META_KEY];
      if (meta && meta.appOrigin === location.origin) {
        chrome.storage.local.remove(EXT_STATE_KEY);
      }
    });
  }

  function buildWidget(meta) {
    if (document.getElementById("extMiniTimer")) return document.getElementById("extMiniTimer");

    const el = document.createElement("div");
    el.id = "extMiniTimer";
    const appTimerUrl = meta && meta.appOrigin ? `${meta.appOrigin}/timer` : "#";
    el.innerHTML = `
      <div class="emt-header">
        <span class="emt-subject" id="emtSubject">-</span>
        <div class="emt-actions">
          <a class="emt-go" id="emtGo" href="${appTimerUrl}" title="Open timer">Open</a>
          <button class="emt-close" id="emtClose" title="Dismiss">X</button>
        </div>
      </div>
      <div class="emt-body">
        <div class="emt-ring-wrap">
          <svg class="emt-ring" viewBox="0 0 80 80">
            <circle class="emt-ring-bg" cx="40" cy="40" r="34"></circle>
            <circle class="emt-ring-fg" cx="40" cy="40" r="34" id="emtRing"></circle>
          </svg>
          <div class="emt-time" id="emtTime">--:--</div>
        </div>
        <div class="emt-info">
          <div class="emt-label">Study Timer</div>
          <div class="emt-status" id="emtStatus">Focus</div>
        </div>
      </div>
    `;

    document.documentElement.appendChild(el);

    const ring = el.querySelector("#emtRing");
    ring.style.strokeDasharray = String(CIRC);
    ring.style.strokeDashoffset = "0";

    el.querySelector("#emtClose").addEventListener("click", () => {
      sessionStorage.setItem(DISMISS_KEY, "1");
      destroyWidget();
    });

    applySavedPosition(el);
    makeDraggable(el);

    return el;
  }

  function clampPosition(left, top, width, height) {
    const maxLeft = Math.max(0, window.innerWidth - width);
    const maxTop = Math.max(0, window.innerHeight - height);
    return {
      left: Math.min(Math.max(0, left), maxLeft),
      top: Math.min(Math.max(0, top), maxTop)
    };
  }

  function applySavedPosition(el) {
    chrome.storage.local.get([EXT_POS_KEY], result => {
      const pos = result[EXT_POS_KEY];
      if (!pos || typeof pos.left !== "number" || typeof pos.top !== "number") return;
      const rect = el.getBoundingClientRect();
      const clamped = clampPosition(pos.left, pos.top, rect.width, rect.height);
      el.style.left = `${clamped.left}px`;
      el.style.top = `${clamped.top}px`;
      el.style.right = "auto";
      el.style.bottom = "auto";
    });
  }

  function makeDraggable(el) {
    const header = el.querySelector(".emt-header");
    if (!header) return;

    let dragging = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;

    header.addEventListener("mousedown", event => {
      if (event.button !== 0) return;
      if (event.target.closest(".emt-go, .emt-close")) return;

      const rect = el.getBoundingClientRect();
      dragging = true;
      startX = event.clientX;
      startY = event.clientY;
      startLeft = rect.left;
      startTop = rect.top;

      el.classList.add("emt-dragging");
      el.style.left = `${rect.left}px`;
      el.style.top = `${rect.top}px`;
      el.style.right = "auto";
      el.style.bottom = "auto";
      event.preventDefault();
    });

    document.addEventListener("mousemove", event => {
      if (!dragging) return;
      const nextLeft = startLeft + (event.clientX - startX);
      const nextTop = startTop + (event.clientY - startY);
      const rect = el.getBoundingClientRect();
      const clamped = clampPosition(nextLeft, nextTop, rect.width, rect.height);
      el.style.left = `${clamped.left}px`;
      el.style.top = `${clamped.top}px`;
    });

    document.addEventListener("mouseup", () => {
      if (!dragging) return;
      dragging = false;
      el.classList.remove("emt-dragging");
      const rect = el.getBoundingClientRect();
      chrome.storage.local.set({
        [EXT_POS_KEY]: {
          left: rect.left,
          top: rect.top
        }
      });
    });
  }

  function destroyWidget() {
    if (tickInterval) {
      clearInterval(tickInterval);
      tickInterval = null;
    }
    const el = document.getElementById("extMiniTimer");
    if (el) el.remove();
    widget = null;
  }

  function computeLive(state) {
    let secondsRan = 0;
    if (state.running && state.intervalRef) {
      secondsRan = Math.floor((Date.now() - state.intervalRef) / 1000);
    }

    if (state.isStopwatch) {
      const elapsed = (state.pausedElapsed || 0) + secondsRan;
      return {
        displaySecs: elapsed,
        fraction: Math.min(1, elapsed / 7200),
        danger: false,
        done: false
      };
    }

    const total = state.totalSeconds || 1;
    const remaining = Math.max(0, (state.pausedRemaining || total) - secondsRan);
    return {
      displaySecs: remaining,
      fraction: remaining / total,
      danger: remaining <= 60 && state.running,
      done: remaining <= 0 && state.running
    };
  }

  function render(state, meta) {
    if (sessionStorage.getItem(DISMISS_KEY)) return;
    if (isTimerPage(meta)) {
      destroyWidget();
      return;
    }

    widget = widget || buildWidget(meta);
    if (!widget) return;

    const live = computeLive(state);
    if (live.done) {
      chrome.storage.local.remove(EXT_STATE_KEY);
      destroyWidget();
      return;
    }

    const timeEl = widget.querySelector("#emtTime");
    const subjEl = widget.querySelector("#emtSubject");
    const statusEl = widget.querySelector("#emtStatus");
    const ringEl = widget.querySelector("#emtRing");
    const goEl = widget.querySelector("#emtGo");

    const color = state.subjectColor || "#c8f060";
    const pulse = "<span class=\"emt-pulse\"></span>";

    widget.style.setProperty("--emt-accent", color);
    ringEl.style.strokeDashoffset = String(CIRC * (1 - Math.max(0, Math.min(1, live.fraction))));
    ringEl.classList.toggle("emt-danger", live.danger);
    widget.classList.toggle("emt-paused", !!state.paused);

    timeEl.textContent = fmt(live.displaySecs);
    timeEl.classList.toggle("emt-danger", live.danger);
    subjEl.textContent = state.subjectName || "-";

    statusEl.innerHTML = state.paused ? "Paused" : live.danger ? `${pulse}Last minute` : `${pulse}Focus`;

    if (meta && meta.appOrigin) {
      goEl.href = `${meta.appOrigin}/timer`;
      goEl.style.pointerEvents = "auto";
      goEl.style.opacity = "1";
    } else {
      goEl.href = "#";
      goEl.style.pointerEvents = "none";
      goEl.style.opacity = "0.5";
    }
  }

  function updateFromSharedState() {
    if (!window.chrome || !chrome.storage || !chrome.storage.local) return;
    chrome.storage.local.get([EXT_STATE_KEY, EXT_META_KEY], result => {
      const pack = result[EXT_STATE_KEY];
      const meta = result[EXT_META_KEY];
      if (!pack || !hasActiveState(pack.state)) {
        destroyWidget();
        return;
      }

      render(pack.state, meta);

      if (!tickInterval) {
        tickInterval = setInterval(() => {
          chrome.storage.local.get([EXT_STATE_KEY, EXT_META_KEY], inner => {
            const statePack = inner[EXT_STATE_KEY];
            const innerMeta = inner[EXT_META_KEY];
            if (!statePack || !hasActiveState(statePack.state)) {
              destroyWidget();
              return;
            }
            render(statePack.state, innerMeta);
          });
        }, 1000);
      }
    });
  }

  if (!isHttpPage()) return;

  upsertSharedStateFromApp();
  updateFromSharedState();

  window.addEventListener("storage", e => {
    if (e.key === APP_LOCAL_KEY) {
      upsertSharedStateFromApp();
    }
  });
  if (window.chrome && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes[EXT_STATE_KEY] || changes[EXT_META_KEY]) {
      updateFromSharedState();
    }
    });
  }

  setInterval(upsertSharedStateFromApp, 1000);
})();






