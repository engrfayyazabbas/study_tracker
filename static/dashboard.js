/**
 * Dashboard – Chart.js charts + micro-interactions
 * ────────────────────────────────────────────────────────────────────────────
 */

document.addEventListener("DOMContentLoaded", () => {
  /* ── Animate stat values on scroll into view ──────────────────────────── */
  const cards = document.querySelectorAll(".stat-card");

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.3 }
  );

  cards.forEach((card) => observer.observe(card));

  /* ── Bar chart entrance animation ─────────────────────────────────────── */
  const bars = document.querySelectorAll(".week-bar");
  bars.forEach((bar, i) => {
    const finalH = bar.style.height;
    bar.style.height = "0%";
    setTimeout(() => {
      bar.style.height = finalH;
    }, 400 + i * 80);
  });

  /* ── Breakdown bar entrance animation ─────────────────────────────────── */
  const bcBars = document.querySelectorAll(".bc-bar");
  bcBars.forEach((bar, i) => {
    const finalW = bar.style.width;
    bar.style.width = "0%";
    setTimeout(() => {
      bar.style.width = finalW;
    }, 600 + i * 60);
  });

  /* ── Chart.js global defaults (match dark theme) ──────────────────────── */
  Chart.defaults.color = "#55546a";
  Chart.defaults.borderColor = "#22222e";
  Chart.defaults.font.family = '"Azeret Mono", monospace';
  Chart.defaults.font.size = 10;
  Chart.defaults.animation.duration = 1200;
  Chart.defaults.animation.easing = "easeOutQuart";

  /* ── Fetch chart data from API ────────────────────────────────────────── */
  fetchChartData();
});


/* ═══════════════════════════════════════════════════════════════════════════
   Fetch + Render Charts
   ═══════════════════════════════════════════════════════════════════════════ */

async function fetchChartData() {
  try {
    const res = await fetch("/api/dashboard/charts");
    const json = await res.json();

    if (!json.ok) {
      console.error("Chart API error:", json);
      return;
    }

    renderDailyChart(json.daily);
    renderWeeklyChart(json.weekly);
    renderSubjectsChart(json.subjects);
  } catch (err) {
    console.error("Failed to fetch chart data:", err);
  }
}


/* ── 1. Daily Study Time – Line Chart ──────────────────────────────────── */
function renderDailyChart({ labels, data }) {
  const ctx = document.getElementById("dailyChart");
  if (!ctx) return;

  // Gradient fill
  const gradient = ctx.getContext("2d").createLinearGradient(0, 0, 0, 220);
  gradient.addColorStop(0, "rgba(200, 240, 96, 0.25)");
  gradient.addColorStop(1, "rgba(200, 240, 96, 0.01)");

  new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Minutes",
        data,
        borderColor: "#c8f060",
        backgroundColor: gradient,
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: "#c8f060",
        pointHoverBorderColor: "#0c0c0f",
        pointHoverBorderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#13131a",
          borderColor: "#22222e",
          borderWidth: 1,
          titleColor: "#e8e6f0",
          bodyColor: "#c8f060",
          titleFont: { weight: "400" },
          padding: 10,
          cornerRadius: 8,
          displayColors: false,
          callbacks: {
            label: (ctx) => `${ctx.parsed.y} min`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            maxTicksLimit: 8,
            maxRotation: 0,
          }
        },
        y: {
          beginAtZero: true,
          grid: {
            color: "rgba(34, 34, 46, 0.6)",
          },
          ticks: {
            callback: (v) => v + "m",
            maxTicksLimit: 5,
          }
        }
      }
    }
  });
}


/* ── 2. Weekly Study Time – Bar Chart ──────────────────────────────────── */
function renderWeeklyChart({ labels, data }) {
  const ctx = document.getElementById("weeklyChart");
  if (!ctx) return;

  new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Minutes",
        data,
        backgroundColor: createBarGradients(ctx, data.length, "#40c8f0", 0.7, 0.2),
        borderColor: "#40c8f0",
        borderWidth: 1,
        borderRadius: 6,
        borderSkipped: false,
        maxBarThickness: 40,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#13131a",
          borderColor: "#22222e",
          borderWidth: 1,
          titleColor: "#e8e6f0",
          bodyColor: "#40c8f0",
          titleFont: { weight: "400" },
          padding: 10,
          cornerRadius: 8,
          displayColors: false,
          callbacks: {
            label: (ctx) => {
              const mins = ctx.parsed.y;
              if (mins >= 60) {
                return `${Math.floor(mins / 60)}h ${mins % 60}m`;
              }
              return `${mins} min`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { maxRotation: 45, minRotation: 30 }
        },
        y: {
          beginAtZero: true,
          grid: {
            color: "rgba(34, 34, 46, 0.6)",
          },
          ticks: {
            callback: (v) => v + "m",
            maxTicksLimit: 5,
          }
        }
      }
    }
  });
}


/* ── 3. Subject-wise Time – Horizontal Bar Chart ───────────────────────── */
function renderSubjectsChart({ labels, data, colors }) {
  const ctx = document.getElementById("subjectsChart");
  if (!ctx) return;

  // Semi-transparent versions of subject colors
  const bgColors = colors.map((c) => hexToRgba(c, 0.65));

  new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Minutes",
        data,
        backgroundColor: bgColors,
        borderColor: colors,
        borderWidth: 1.5,
        borderRadius: 6,
        borderSkipped: false,
        maxBarThickness: 32,
      }]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#13131a",
          borderColor: "#22222e",
          borderWidth: 1,
          titleColor: "#e8e6f0",
          bodyColor: "#e8e6f0",
          titleFont: { weight: "700" },
          padding: 10,
          cornerRadius: 8,
          displayColors: true,
          callbacks: {
            label: (ctx) => {
              const mins = ctx.parsed.x;
              if (mins >= 60) {
                return ` ${Math.floor(mins / 60)}h ${mins % 60}m (${mins} min)`;
              }
              return ` ${mins} min`;
            }
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: {
            color: "rgba(34, 34, 46, 0.6)",
          },
          ticks: {
            callback: (v) => v + "m",
            maxTicksLimit: 6,
          }
        },
        y: {
          grid: { display: false },
          ticks: {
            color: "#e8e6f0",
            font: { size: 11, weight: "600" },
          }
        }
      }
    }
  });
}


/* ═══════════════════════════════════════════════════════════════════════════
   Utilities
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Create vertical gradient backgrounds for each bar
 */
function createBarGradients(canvas, count, hex, alphaTop, alphaBottom) {
  const ctx2d = canvas.getContext("2d");
  const arr = [];
  for (let i = 0; i < count; i++) {
    const g = ctx2d.createLinearGradient(0, 0, 0, 220);
    g.addColorStop(0, hexToRgba(hex, alphaTop));
    g.addColorStop(1, hexToRgba(hex, alphaBottom));
    arr.push(g);
  }
  return arr;
}

/**
 * Convert hex color to rgba string
 */
function hexToRgba(hex, alpha) {
  hex = hex.replace("#", "");
  if (hex.length === 3) {
    hex = hex.split("").map((c) => c + c).join("");
  }
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
