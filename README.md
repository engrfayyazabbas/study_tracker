# 📚 Personal Study Tracker

> A **Flask + SQLite** web application for tracking study sessions across multiple subjects with a built-in Pomodoro timer, analytics dashboard, Chart.js visualizations, and session history.

---

## ✨ Features

### 📘 Subjects Management (`/`)
- Add, edit, and delete study subjects
- Assign a custom color to each subject (hex color picker + preset swatches)
- Subjects are listed in reverse-chronological order with inline edit/delete actions

### ⏱ Study Timer (`/timer`)
- Pomodoro-style countdown timer with preset modes (25 min, 50 min, custom)
- SVG ring progress indicator with real-time countdown display
- Subject selection and optional session notes
- Automatic session saving when the timer is stopped
- Today's session log with inline deletion, duration, and time range

### 📋 Sessions History (`/sessions`)
- All sessions grouped by date with expandable day sections
- Per-subject aggregate stats: total study time, session count, and percentage bar
- All-time total study time banner
- Inline session deletion with confirmation
- JSON API reference panel

### 📊 Dashboard (`/dashboard`)
- **4 Stat Cards** — Today's study time, sessions today, daily average, current streak
- **Last 7 Days** — CSS bar chart showing daily activity at a glance
- **Top Subject Today** — Highlighted card for the most-studied subject of the day
- **All Subjects Breakdown** — Per-subject totals with animated progress bars
- **Chart.js Visualizations:**
  - 📈 **Daily Study Time** — Line chart with gradient fill (last 30 days)
  - 📊 **Weekly Study Time** — Bar chart with gradient (last 12 weeks)
  - 📊 **Subject-wise Study Time** — Horizontal bar chart with per-subject colors (all-time)
- All-time total study banner

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Python 3 + Flask |
| **Database** | SQLite 3 |
| **Frontend** | HTML5, CSS3, Vanilla JavaScript |
| **Charts** | Chart.js v4.4.7 (CDN) |
| **Fonts** | Google Fonts (Inter, JetBrains Mono) |
| **Design** | Deep Space Dark theme (#09090b), glassmorphism, responsive Bento Grid, luminous accents |

---

## 📂 Project Structure

```
files/
├── app.py             # Main Flask application
├── database.py        # Database connection & init helper
├── schema.sql         # Database schema
├── requirements.txt   # Python dependencies
├── study_tracker.db   # SQLite database (auto-created)
├── templates/         # HTML Jinja2 templates (Bento Grid layout)
└── static/            # CSS styles and Vanilla JS
```

---

## 🚀 Quick Start

```bash
# 1. Create & activate virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS / Linux

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run the app
python app.py

# 4. Open in browser
# → http://127.0.0.1:5000
```

## 🎨 Design Decisions

- **Premium Modern Aesthetic** — Rebuilt the layout using a deeply immersive **Deep Space Dark Theme** (`#09090b` baseline) enhanced by soft glassmorphism components (`rgba(255,255,255,0.03)` with `backdrop-filter: blur(16px)`).
- **Global Bento Grid Structure** — All pages (Dashboard, Timer, Sessions, Subjects) adhere to a clean, scalable Bento grid wrapper that naturally adapts to any screen size.
- **Top-tier Typography** — Completely overhauled typing stack utilizing `Inter` for general UI legibility and `JetBrains Mono` for precise numbers and technical labels.
- **Micro-animations & Interactions** — Implemented smooth hover scaling effects (`cubic-bezier(0.2, 0.8, 0.2, 1)`), staggered fades upon entrance, and modern dynamic coloring on focus.
- **No build tools** — Pure HTML/CSS/JS with Jinja2 templating; Chart.js loaded via CDN. Server-side rendering handles the layout while client-side JS gracefully pulls data.

---

## 💡 Future Improvements

- [ ] **Goals & targets** — Set daily/weekly study time goals with progress tracking
- [ ] **Export data** — CSV/PDF export of session history
- [ ] **Authentication** — Multi-user support with login/signup
- [ ] **Dark/light theme toggle** — User-switchable theme preference
- [ ] **Mobile PWA** — Progressive Web App with offline support
- [ ] **Notifications** — Browser notifications for timer completion
- [ ] **Calendar heatmap** — GitHub-style contribution graph for study days
- [ ] **Pomodoro break timer** — Automatic short/long break cycles
- [ ] **Subject categories** — Group subjects by course, semester, or tag
- [ ] **Session editing** — Edit existing session records (time, notes, subject)
