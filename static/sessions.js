/**
 * sessions.js
 * Handles:
 *   • Live session deletion  (DELETE /api/sessions/<id>)
 *   • Manual session modal   (POST  /api/sessions/manual)
 */

/* ── Delete ─────────────────────────────────────────────────────────────────── */

async function deleteSession(id, btn) {
  if (!confirm("Delete this session?")) return;

  const item = btn.closest(".session-item");
  item.classList.add("removing");

  try {
    const res  = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    const data = await res.json();

    if (data.ok) {
      setTimeout(() => {
        const group = item.closest(".day-group");
        item.remove();

        // Remove day group if empty
        if (group && group.querySelectorAll(".session-item").length === 0) {
          group.remove();
        }

        updateTotal();
      }, 260);
    } else {
      item.classList.remove("removing");
      alert("Could not delete: " + (data.error || "unknown error"));
    }
  } catch {
    item.classList.remove("removing");
    alert("Network error — could not delete session.");
  }
}

function updateTotal() {
  let total = 0;
  document.querySelectorAll(".s-duration").forEach(el => {
    total += parseInt(el.textContent) || 0;
  });

  const strong = document.getElementById("grandTotal");
  if (strong) {
    const h = Math.floor(total / 60);
    const m = total % 60;
    strong.textContent = `${total} min (${h}h ${m}m)`;
  }
}

/* ── Manual session modal ───────────────────────────────────────────────────── */

const modal        = document.getElementById("manualModal");
const openBtn      = document.getElementById("openManualModal");
const closeBtn     = document.getElementById("modalCloseBtn");
const cancelBtn    = document.getElementById("modalCancelBtn");
const form         = document.getElementById("manualSessionForm");
const errorEl      = document.getElementById("msError");
const saveBtn      = document.getElementById("msSaveBtn");

// Pre-fill date to today
document.getElementById("msDate").value = new Date().toISOString().slice(0, 10);

// Pre-fill start time to current HH:MM
const now = new Date();
document.getElementById("msStart").value =
  String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");

function openModal() {
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.getElementById("msSubject").focus();
}

function closeModal() {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  hideError();
}

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.hidden = false;
}

function hideError() {
  errorEl.hidden = true;
}

openBtn  && openBtn.addEventListener("click", openModal);
closeBtn && closeBtn.addEventListener("click", closeModal);
cancelBtn && cancelBtn.addEventListener("click", closeModal);

// Close on backdrop click
modal && modal.addEventListener("click", e => {
  if (e.target === modal) closeModal();
});

// Keyboard: Escape closes
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && modal.classList.contains("is-open")) closeModal();
});

/* ── Form submission ─────────────────────────────────────────────────────────── */

form && form.addEventListener("submit", async e => {
  e.preventDefault();
  hideError();

  const subjectId = document.getElementById("msSubject").value;
  const date      = document.getElementById("msDate").value;
  const startTime = document.getElementById("msStart").value;
  const duration  = parseInt(document.getElementById("msDuration").value, 10);
  const notes     = document.getElementById("msNotes").value.trim();

  if (!subjectId)          return showError("Please select a subject.");
  if (!date)               return showError("Please select a date.");
  if (!startTime)          return showError("Please enter a start time.");
  if (!duration || duration < 1) return showError("Duration must be at least 1 minute.");

  saveBtn.disabled = true;
  saveBtn.textContent = "Saving…";

  try {
    const res  = await fetch("/api/sessions/manual", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ subject_id: subjectId, date, start_time: startTime,
                                duration_minutes: duration, notes })
    });
    const data = await res.json();

    if (data.ok) {
      injectSession(data.session);
      updateTotal();
      form.reset();
      // Reset date/time back to now
      document.getElementById("msDate").value  = new Date().toISOString().slice(0, 10);
      const n = new Date();
      document.getElementById("msStart").value =
        String(n.getHours()).padStart(2, "0") + ":" + String(n.getMinutes()).padStart(2, "0");
      closeModal();
    } else {
      showError(data.error || "Failed to save session.");
    }
  } catch {
    showError("Network error — could not save session.");
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save Session";
  }
});

/* ── DOM injection of new session row ───────────────────────────────────────── */

function injectSession(s) {
  const historySection = document.querySelector(".history");
  if (!historySection) return;

  const dateKey  = s.date;          // YYYY-MM-DD
  const startStr = s.start_time.slice(11, 16); // HH:MM
  const endStr   = s.end_time.slice(11, 16);

  // Build session <li>
  const li = document.createElement("li");
  li.className = "session-item";
  li.style.cssText = `--dot: ${s.color}`;
  li.dataset.id = s.id;
  li.innerHTML = `
    <span class="s-dot"></span>
    <span class="s-subject">${escHtml(s.subject_name)}</span>
    <span class="s-time">${startStr} – ${endStr}</span>
    <span class="s-duration">${s.duration} min</span>
    ${s.notes ? `<span class="s-notes" title="${escHtml(s.notes)}">📝</span>` : ""}
    <button class="s-delete" title="Delete session"
            onclick="deleteSession(${s.id}, this)">✕</button>
  `;

  // Try to find existing day group
  let dayGroup = [...historySection.querySelectorAll(".day-group")]
    .find(g => g.querySelector(".day-label")?.textContent.trim() === dateKey);

  if (dayGroup) {
    // Prepend to existing group's list
    const list = dayGroup.querySelector(".session-list");
    list.prepend(li);
    // Update day total
    const dayTotalEl = dayGroup.querySelector(".day-total");
    if (dayTotalEl) {
      let dayTotal = 0;
      list.querySelectorAll(".s-duration").forEach(el => dayTotal += parseInt(el.textContent) || 0);
      dayTotalEl.textContent = `${dayTotal} min`;
    }
  } else {
    // Create new day group and insert at right position (newest first)
    const newGroup = document.createElement("div");
    newGroup.className = "day-group";
    newGroup.innerHTML = `
      <div class="day-header">
        <span class="day-label">${escHtml(dateKey)}</span>
        <span class="day-total">${s.duration} min</span>
      </div>
      <ul class="session-list"></ul>
    `;
    newGroup.querySelector(".session-list").appendChild(li);

    // Find where to insert (date sorted newest first)
    let inserted = false;
    const groups = [...historySection.querySelectorAll(".day-group")];
    for (const g of groups) {
      const gDate = g.querySelector(".day-label")?.textContent.trim() || "";
      if (dateKey > gDate) {
        historySection.insertBefore(newGroup, g);
        inserted = true;
        break;
      }
    }
    if (!inserted) historySection.appendChild(newGroup);

    // Remove empty-history placeholder if present
    const emptyEl = historySection.querySelector(".empty-history");
    if (emptyEl) emptyEl.remove();
  }

  // Stagger animation
  li.style.animationDelay = "0ms";
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ── Load animation ─────────────────────────────────────────────────────────── */
document.querySelectorAll(".session-item").forEach((el, i) => {
  el.style.animationDelay = `${i * 30}ms`;
});
