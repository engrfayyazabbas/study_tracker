// ── Auto-clear form after submission ─────────────────────────────────────────
const form = document.getElementById("noteForm");

form?.addEventListener("submit", () => {
  // Brief visual feedback before the page reloads
  const btn = form.querySelector("button[type='submit']");
  btn.textContent = "Saving…";
  btn.disabled = true;
});

// ── Stagger note card animations ─────────────────────────────────────────────
document.querySelectorAll(".note-card").forEach((card, i) => {
  card.style.animationDelay = `${i * 60}ms`;
});

// ── Auto-resize textarea as user types ───────────────────────────────────────
const textarea = document.getElementById("content");

textarea?.addEventListener("input", function () {
  this.style.height = "auto";
  this.style.height = this.scrollHeight + "px";
});
