/**
 * timer.js (localStorage-only)
 * Full timer page + mini-timer shared state.
 */

const display       = document.getElementById("timerDisplay");
const subjectLabel  = document.getElementById("timerSubject");
const ring          = document.getElementById("ringProgress");
const statusBar     = document.getElementById("statusBar");
const playBtn       = document.getElementById("playBtn");
const stopBtn       = document.getElementById("stopBtn");
const resetBtn      = document.getElementById("resetBtn");
const muteBtn       = document.getElementById("muteBtn");
const subjectSelect = document.getElementById("subjectSelect");
const notesInput    = document.getElementById("sessionNotes");
const customRow     = document.getElementById("customRow");
const customInput   = document.getElementById("customMinutes");
const setCustomBtn  = document.getElementById("setCustomBtn");
const sessionLog    = document.getElementById("sessionLog");
const logTotal      = document.getElementById("logTotal");
const playIcon      = document.getElementById("playIcon");
const goalBar       = document.getElementById("goalBar");
const goalText      = document.getElementById("goalText");
const goalInput     = document.getElementById("goalInput");
const setGoalBtn    = document.getElementById("setGoalBtn");

const CIRCUMFERENCE   = 2 * Math.PI * 116;
const STOPWATCH_CAP   = 7200;
const GOAL_KEY        = "studyGoalMinutes";
const MINI_STORE_KEY  = "studyTimerState";
const SESSION_STORE_KEY = "studySessionsByDay";

ring.style.strokeDasharray  = CIRCUMFERENCE;
ring.style.strokeDashoffset = 0;

let totalSeconds     = 25 * 60;
let intervalRef      = null;
let sessionStartTime = null;
let pausedRemaining  = totalSeconds;
let pausedElapsed    = 0;
let remaining        = totalSeconds;
let elapsed          = 0;
let intervalId       = null;
let running          = false;
let paused           = false;
let isStopwatch      = false;
let muted            = false;

let goalMinutes = parseInt(localStorage.getItem(GOAL_KEY), 10) || 120;
if (goalInput) goalInput.value = goalMinutes;

function saveMiniState() {
  const opt = subjectSelect.options[subjectSelect.selectedIndex];
  const state = {
    running, paused, isStopwatch, totalSeconds,
    pausedRemaining, pausedElapsed, intervalRef,
    subjectName:  opt && opt.value ? opt.text.trim() : "-",
    subjectColor: opt && opt.value ? (opt.dataset.color || "#c8f060") : "#c8f060"
  };
  localStorage.setItem(MINI_STORE_KEY, JSON.stringify(state));
}

function clearMiniState() {
  localStorage.removeItem(MINI_STORE_KEY);
}

function todayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function readSessionStore() {
  try {
    const raw = localStorage.getItem(SESSION_STORE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeSessionStore(store) {
  localStorage.setItem(SESSION_STORE_KEY, JSON.stringify(store));
}

function getTodaySessionsFromStorage() {
  const store = readSessionStore();
  const sessions = store[todayKey()];
  return Array.isArray(sessions) ? sessions : [];
}

function persistSessionToStorage(session) {
  const store = readSessionStore();
  const key = todayKey();
  const sessions = Array.isArray(store[key]) ? store[key] : [];
  sessions.push(session);
  store[key] = sessions;
  writeSessionStore(store);
}

function setLogTotal(totalMinutes) {
  const match = logTotal ? logTotal.querySelector("strong") : null;
  if (match) {
    match.textContent = `${totalMinutes} min`;
  }
}

function createLogItemEl(session) {
  const li = document.createElement("li");
  const color = session.color || "#888";
  const start = (session.start_time || "").substring(11, 16);
  const end = (session.end_time || "").substring(11, 16);
  li.className = "log-item";
  li.style.setProperty("--dot", color);
  li.innerHTML = `
    <span class="log-dot"></span>
    <div class="log-info">
      <strong>${session.subject_name || "Unknown"}</strong>
      <span>${session.duration || 0} min · ${start} - ${end}</span>
    </div>`;
  return li;
}

function hydrateTodayLogFromStorage() {
  if (!sessionLog) return;
  const sessions = getTodaySessionsFromStorage();
  sessionLog.innerHTML = "";

  if (!sessions.length) {
    const empty = document.createElement("li");
    empty.className = "log-empty";
    empty.id = "logEmpty";
    empty.textContent = "No sessions yet today.";
    sessionLog.appendChild(empty);
    setLogTotal(0);
    return;
  }

  let total = 0;
  sessions.forEach(session => {
    total += parseInt(session.duration, 10) || 0;
  });

  sessions.slice().reverse().forEach(session => {
    sessionLog.appendChild(createLogItemEl(session));
  });

  setLogTotal(total);
  renderGoalBar(total);
}

function fmt(secs) {
  const h = Math.floor(secs / 3600);
  const m = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
  const s = String(secs % 60).padStart(2, "0");
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
}

function setRing(fraction) {
  ring.style.strokeDashoffset = CIRCUMFERENCE * (1 - Math.min(1, Math.max(0, fraction)));
}

function setStatus(msg, cls = "") {
  statusBar.textContent = msg;
  statusBar.className   = "status-bar " + cls;
}

function setPauseIcon() {
  playIcon.innerHTML = `<rect x="6" y="4" width="4" height="16" rx="1"/>
                        <rect x="14" y="4" width="4" height="16" rx="1"/>`;
}

function setPlayIcon() {
  playIcon.innerHTML = `<polygon points="6,4 20,12 6,20"/>`;
}

function isLightColor(hex) {
  if (!hex || hex.length < 7) return false;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 0.299 + g * 0.587 + b * 0.114) > 128;
}

function getSelectedColor() {
  const opt = subjectSelect.options[subjectSelect.selectedIndex];
  return (opt && opt.value) ? (opt.dataset.color || null) : null;
}

function applySubjectTheme() {
  const color = getSelectedColor();
  if (color) {
    playBtn.style.background = color;
    playBtn.style.color = isLightColor(color) ? "#0c0c0f" : "#e8e6f0";
  } else {
    playBtn.style.background = "";
    playBtn.style.color = "";
  }
  const inDanger = ring.classList.contains("danger");
  const pausedRing = ring.classList.contains("paused");
  if (color && running && !inDanger && !pausedRing) {
    ring.style.stroke = color;
  } else {
    ring.style.stroke = "";
  }
}

subjectSelect.addEventListener("change", applySubjectTheme);

document.querySelectorAll(".mode-pill").forEach(pill => {
  pill.addEventListener("click", () => {
    if (running || paused) return;
    document.querySelectorAll(".mode-pill").forEach(p => p.classList.remove("active"));
    pill.classList.add("active");
    const minutes = pill.dataset.minutes;
    if (minutes === "custom") {
      customRow.classList.remove("hidden");
      isStopwatch = false;
    } else if (minutes === "stopwatch") {
      customRow.classList.add("hidden");
      isStopwatch = true;
      elapsed = pausedElapsed = 0;
      updateDisplay();
    } else {
      customRow.classList.add("hidden");
      isStopwatch = false;
      totalSeconds = parseInt(minutes, 10) * 60;
      remaining = pausedRemaining = totalSeconds;
      updateDisplay();
    }
  });
});

setCustomBtn.addEventListener("click", () => {
  const val = parseInt(customInput.value, 10);
  if (!val || val < 1 || val > 240) {
    setStatus("Enter a number between 1 and 240", "warning");
    return;
  }
  isStopwatch = false;
  totalSeconds = val * 60;
  remaining = pausedRemaining = totalSeconds;
  updateDisplay();
  setStatus(`Custom timer set: ${val} min`);
});

function updateDisplay() {
  if (isStopwatch) {
    display.textContent = fmt(elapsed);
    setRing(elapsed / STOPWATCH_CAP);
    display.classList.remove("danger");
    ring.classList.remove("danger");
  } else {
    display.textContent = fmt(remaining);
    setRing(remaining / totalSeconds);
    const danger = remaining <= 60 && running;
    display.classList.toggle("danger", danger);
    ring.classList.toggle("danger", danger);
  }
  ring.classList.toggle("paused", paused);
  applySubjectTheme();
}

function tick() {
  if (!running) return;
  const secondsRan = Math.floor((Date.now() - intervalRef) / 1000);
  if (isStopwatch) {
    elapsed = pausedElapsed + secondsRan;
    updateDisplay();
  } else {
    remaining = Math.max(0, pausedRemaining - secondsRan);
    updateDisplay();
    if (remaining <= 0) {
      clearInterval(intervalId);
      running = false;
      clearMiniState();
      setStatus("Time is up! Saving session...", "ok");
      playChime();
      fireNotification("Time is up!", "Your study session is complete. Great work!");
      saveSession(true);
    }
  }
}

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && running) tick();
});

function handlePlayPause() {
  const subjectId = subjectSelect.value;

  if (!running && !paused) {
    if (!subjectId) {
      setStatus("Please select a subject first!", "warning");
      subjectSelect.focus();
      return;
    }
    requestNotifPermission();
    sessionStartTime = new Date();
    intervalRef      = Date.now();
    pausedRemaining  = isStopwatch ? 0 : totalSeconds;
    pausedElapsed    = 0;
    running = true;
    paused  = false;
    subjectLabel.textContent = subjectSelect.options[subjectSelect.selectedIndex].text;
    stopBtn.disabled = false;
    setPauseIcon();
    setStatus("Focus...", "ok");
    applySubjectTheme();
    saveMiniState();
    tick();
    intervalId = setInterval(tick, 1000);

  } else if (running && !paused) {
    clearInterval(intervalId);
    const secondsRan = Math.floor((Date.now() - intervalRef) / 1000);
    pausedRemaining  = Math.max(0, pausedRemaining - secondsRan);
    pausedElapsed    = pausedElapsed + secondsRan;
    paused  = true;
    running = false;
    ring.style.stroke = "";
    setPlayIcon();
    ring.classList.add("paused");
    setStatus("Paused - click play to resume");
    saveMiniState();

  } else if (paused) {
    intervalRef = Date.now();
    paused  = false;
    running = true;
    ring.classList.remove("paused");
    setPauseIcon();
    setStatus("Focus...", "ok");
    applySubjectTheme();
    saveMiniState();
    tick();
    intervalId = setInterval(tick, 1000);
  }
}

playBtn.addEventListener("click", handlePlayPause);

function handleStop() {
  if (!running && !paused) return;
  clearInterval(intervalId);
  if (running) {
    const secondsRan = Math.floor((Date.now() - intervalRef) / 1000);
    elapsed   = pausedElapsed + secondsRan;
    remaining = Math.max(0, pausedRemaining - secondsRan);
  }
  running = false;
  paused  = false;
  const studiedSecs = isStopwatch ? elapsed : (totalSeconds - remaining);
  if (studiedSecs < 60) {
    setStatus("Session too short to save (< 1 min)");
    clearMiniState();
    resetState();
    return;
  }
  setStatus("Saving session...", "ok");
  saveSession(false);
}

stopBtn.addEventListener("click", handleStop);

function handleReset() {
  clearInterval(intervalId);
  resetState();
  setStatus("Select a subject and press play");
}

resetBtn.addEventListener("click", handleReset);

function resetState() {
  running = paused = false;
  remaining = pausedRemaining = totalSeconds;
  elapsed = pausedElapsed = 0;
  intervalRef = sessionStartTime = null;
  stopBtn.disabled = true;
  setPlayIcon();
  ring.classList.remove("paused", "danger");
  display.classList.remove("danger");
  ring.style.stroke = "";
  subjectLabel.textContent = "-";
  clearMiniState();
  updateDisplay();
}

function saveSession(completed) {
  const endTime   = new Date();
  const subjectId = subjectSelect.value;
  const notes     = notesInput.value.trim();
  const studiedSecs = isStopwatch ? elapsed : (totalSeconds - remaining);
  const duration    = Math.max(1, Math.round(studiedSecs / 60));
  const opt = subjectSelect.options[subjectSelect.selectedIndex];
  const startIso = sessionStartTime
    ? sessionStartTime.toISOString()
    : new Date(endTime.getTime() - duration * 60 * 1000).toISOString();

  const session = {
    subject_id: subjectId,
    subject_name: opt && opt.value ? opt.text.trim() : "Unknown",
    color: opt && opt.value ? (opt.dataset.color || "#888") : "#888",
    start_time: startIso,
    end_time: endTime.toISOString(),
    duration,
    notes,
    completed
  };

  persistSessionToStorage(session);
  setStatus(`Saved locally - ${duration} min of ${session.subject_name}`, "ok");
  addLogItem(session);
  bumpGoalBar(duration);

  resetState();
  notesInput.value = "";
}

function addLogItem(session) {
  const emptyEl = document.getElementById("logEmpty");
  if (emptyEl) emptyEl.remove();

  if (!sessionLog) return;
  const li = createLogItemEl(session);
  sessionLog.prepend(li);

  const match   = logTotal ? logTotal.querySelector("strong") : null;
  const current = match ? (parseInt(match.textContent, 10) || 0) : 0;
  setLogTotal(current + (parseInt(session.duration, 10) || 0));
}

function renderGoalBar(currentMin) {
  const pct = Math.min(100, Math.round((currentMin / goalMinutes) * 100));
  if (goalBar) goalBar.style.width = pct + "%";
  if (goalText) {
    goalText.textContent = `${currentMin} / ${goalMinutes} min - ${pct}%`;
    goalText.classList.toggle("goal-done", pct >= 100);
  }
}

function bumpGoalBar() {
  const match   = logTotal ? logTotal.querySelector("strong") : null;
  const current = match ? (parseInt(match.textContent, 10) || 0) : 0;
  renderGoalBar(current);
}

if (setGoalBtn) {
  setGoalBtn.addEventListener("click", () => {
    const val = parseInt(goalInput.value, 10);
    if (!val || val < 10 || val > 1440) {
      setStatus("Goal must be 10-1440 min", "warning");
      return;
    }
    goalMinutes = val;
    localStorage.setItem(GOAL_KEY, val);
    const match   = logTotal ? logTotal.querySelector("strong") : null;
    const current = match ? (parseInt(match.textContent, 10) || 0) : 0;
    renderGoalBar(current);
    setStatus(`Daily goal set to ${val} min`, "ok");
  });
}

function requestNotifPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function fireNotification(title, body) {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body });
  }
}

function playChime() {
  if (muted) return;
  try {
    const ctx   = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.22, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
      osc.start(t);
      osc.stop(t + 0.5);
    });
  } catch (e) { console.warn("Audio unavailable:", e); }
}

if (muteBtn) {
  muteBtn.addEventListener("click", () => {
    muted = !muted;
    muteBtn.textContent = muted ? "??" : "??";
    muteBtn.title       = muted ? "Unmute" : "Mute sound";
    muteBtn.classList.toggle("muted", muted);
    setStatus(muted ? "Sound muted" : "Sound on");
  });
}

document.addEventListener("keydown", e => {
  if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  switch (e.key) {
    case " ":           e.preventDefault(); handlePlayPause(); break;
    case "s": case "S": e.preventDefault(); if (!stopBtn.disabled) handleStop(); break;
    case "r": case "R": e.preventDefault(); handleReset(); break;
  }
});

updateDisplay();
(() => {
  hydrateTodayLogFromStorage();
  const match   = logTotal ? logTotal.querySelector("strong") : null;
  const current = match ? (parseInt(match.textContent, 10) || 0) : 0;
  renderGoalBar(current);
})();
