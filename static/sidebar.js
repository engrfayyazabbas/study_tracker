document.addEventListener("DOMContentLoaded", () => {
  const sidebar = document.getElementById("globalSidebar");
  const toggleBtn = document.getElementById("sidebarToggle");
  const overlay = document.getElementById("sidebarOverlay");

  // Default state is expanded. Check localStorage for user preference.
  // Note: Only applies to desktop view.
  const isCollapsed = localStorage.getItem("sidebar_collapsed") === "true";
  if (isCollapsed) {
    sidebar.classList.add("collapsed");
  } else {
    sidebar.classList.remove("collapsed");
  }

  // Desktop Toggle
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      sidebar.classList.toggle("collapsed");
      localStorage.setItem("sidebar_collapsed", sidebar.classList.contains("collapsed"));
    });
  }

  // Mobile Toggle & Overlay
  // Generate a mobile toggle button dynamically, or select it if it exists.
  let mobileBtn = document.getElementById("mobileNavToggle");
  if (!mobileBtn) {
    mobileBtn = document.createElement("button");
    mobileBtn.id = "mobileNavToggle";
    mobileBtn.className = "mobile-nav-toggle";
    mobileBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
      <line x1="3" y1="12" x2="21" y2="12"></line>
      <line x1="3" y1="6" x2="21" y2="6"></line>
      <line x1="3" y1="18" x2="21" y2="18"></line>
    </svg>`;
    document.body.appendChild(mobileBtn);
  }

  mobileBtn.addEventListener("click", () => {
    sidebar.classList.add("mobile-open");
    if(overlay) overlay.classList.add("show");
  });

  if (overlay) {
    overlay.addEventListener("click", () => {
      sidebar.classList.remove("mobile-open");
      overlay.classList.remove("show");
    });
  }
});
