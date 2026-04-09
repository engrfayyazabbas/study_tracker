/* subjects.js – handles edit mode + color swatch selection */

const form        = document.getElementById("subjectForm");
const formTitle   = document.getElementById("formTitle");
const submitBtn   = document.getElementById("submitBtn");
const cancelBtn   = document.getElementById("cancelBtn");
const nameInput   = document.getElementById("name");
const colorInput  = document.getElementById("color");
const editProxy   = document.getElementById("editProxy");
const proxyName   = document.getElementById("proxyName");
const proxyColor  = document.getElementById("proxyColor");

// ── Color swatch clicks ───────────────────────────────────────────────────────
document.querySelectorAll(".swatch").forEach(btn => {
  btn.addEventListener("click", () => {
    colorInput.value = btn.dataset.color;
    document.querySelectorAll(".swatch").forEach(s => s.classList.remove("active"));
    btn.classList.add("active");
  });
});

// Sync swatch highlight when native color picker changes
colorInput.addEventListener("input", () => {
  document.querySelectorAll(".swatch").forEach(s => {
    s.classList.toggle("active", s.dataset.color === colorInput.value);
  });
});

// ── Edit button ───────────────────────────────────────────────────────────────
document.querySelectorAll(".edit-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const row     = btn.closest(".subject-row");
    const id      = row.dataset.id;
    const name    = row.dataset.name;
    const color   = row.dataset.color;

    // Highlight the row being edited
    document.querySelectorAll(".subject-row").forEach(r => r.classList.remove("editing"));
    row.classList.add("editing");

    // Fill sidebar form
    formTitle.textContent   = "Edit Subject";
    submitBtn.textContent   = "Save Changes";
    nameInput.value         = name;
    colorInput.value        = color;
    cancelBtn.classList.remove("hidden");

    // Sync swatch highlight
    document.querySelectorAll(".swatch").forEach(s => {
      s.classList.toggle("active", s.dataset.color === color);
    });

    // On submit → redirect form to /subjects/<id>/edit
    form.onsubmit = (e) => {
      e.preventDefault();
      editProxy.action  = `/subjects/${id}/edit`;
      proxyName.value   = nameInput.value;
      proxyColor.value  = colorInput.value;
      editProxy.submit();
    };

    nameInput.focus();
    // Smooth scroll to sidebar on mobile
    document.querySelector(".sidebar").scrollIntoView({ behavior: "smooth" });
  });
});

// ── Cancel edit ───────────────────────────────────────────────────────────────
cancelBtn.addEventListener("click", resetForm);

function resetForm() {
  formTitle.textContent = "New Subject";
  submitBtn.textContent = "Add Subject";
  nameInput.value       = "";
  colorInput.value      = "#4A90D9";
  form.onsubmit         = null;   // restore default POST to /subjects/add
  cancelBtn.classList.add("hidden");
  document.querySelectorAll(".subject-row").forEach(r => r.classList.remove("editing"));
  document.querySelectorAll(".swatch").forEach(s => s.classList.remove("active"));
}

// ── Stagger list animation ────────────────────────────────────────────────────
document.querySelectorAll(".subject-row").forEach((row, i) => {
  row.style.animationDelay = `${i * 50}ms`;
});
