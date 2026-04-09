/**
 * sessions.js
 * Handles live session deletion via DELETE /api/sessions/<id>
 */

async function deleteSession(id, btn) {
  if (!confirm("Delete this session?")) return;

  const item = btn.closest(".session-item");
  item.classList.add("removing");

  try {
    const res  = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    const data = await res.json();

    if (data.ok) {
      // Wait for CSS transition then remove element
      setTimeout(() => {
        const group = item.closest(".day-group");
        item.remove();

        // Remove day group if empty
        if (group && group.querySelectorAll(".session-item").length === 0) {
          group.remove();
        }

        // Update all-time total in banner
        updateTotal();
      }, 260);
    } else {
      item.classList.remove("removing");
      alert("Could not delete: " + (data.error || "unknown error"));
    }
  } catch (err) {
    item.classList.remove("removing");
    alert("Network error — could not delete session.");
  }
}

function updateTotal() {
  // Recalculate total from remaining s-duration spans
  let total = 0;
  document.querySelectorAll(".s-duration").forEach(el => {
    total += parseInt(el.textContent) || 0;
  });

  const banner = document.querySelector(".total-banner strong");
  if (banner) {
    const h = Math.floor(total / 60);
    const m = total % 60;
    banner.textContent = `${total} min (${h}h ${m}m)`;
  }
}

// Stagger animation for session rows on load
document.querySelectorAll(".session-item").forEach((el, i) => {
  el.style.animationDelay = `${i * 30}ms`;
});
