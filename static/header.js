/**
 * header.js
 * Handles mobile dropdown toggle for the top navigation bar.
 */

document.addEventListener("DOMContentLoaded", () => {
    const mobileToggleBtn = document.getElementById("mobileToggleBtn");
    const mobileNavDropdown = document.getElementById("mobileNavDropdown");
  
    if (mobileToggleBtn && mobileNavDropdown) {
      mobileToggleBtn.addEventListener("click", () => {
        mobileNavDropdown.classList.toggle("open");
      });
    }
  });
