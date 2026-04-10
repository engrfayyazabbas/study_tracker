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
| **Fonts** | Google Fonts (Azeret Mono, Instrument Serif, IBM Plex Mono, Fraunces) |
| **Design** | Dark theme, monospaced typography, electric lime + cyan accent colors |

---

## 📂 Project Structure

```
files/
│
├── app.py                  # Flask application — all routes & API endpoints
├── database.py             # SQLite helper: connection factory & schema init
├── schema.sql              # Full database schema (tables, indexes, triggers, views)
├── requirements.txt        # Python dependencies (Flask)
├── README.md               # ← You are here
│
├── study_tracker.db        # SQLite database (auto-created on first run)
├── notes.db                # Legacy database file (can be removed)
│
├── templates/              # Jinja2 HTML templates
│   ├── subjects.html       #   → Subjects management page (home "/")
│   ├── timer.html          #   → Study timer page ("/timer")
│   ├── sessions.html       #   → Session history & stats ("/sessions")
│   ├── dashboard.html      #   → Dashboard with stats & Chart.js ("/dashboard")
│   └── index.html          #   → Original / base template
│
├── static/                 # Static assets served by Flask
│   ├── style.css           #   → Global / shared styles
│   ├── script.js           #   → Global JS utilities
│   ├── subjects.css        #   → Styles for subjects page
│   ├── subjects.js         #   → JS for subjects CRUD operations
│   ├── timer.css           #   → Styles for timer page
│   ├── timer.js            #   → Timer logic (start/stop/save session)
│   ├── sessions.css        #   → Styles for sessions history page
│   ├── sessions.js         #   → JS for sessions page (filtering, delete)
│   ├── dashboard.css       #   → Styles for dashboard (cards, charts, layout)
│   └── dashboard.js        #   → Chart.js rendering + micro-interactions
│
└── __pycache__/            # Python bytecode cache (auto-generated)
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

---

## 🔗 API Endpoints

### Pages (HTML)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Subjects management page |
| `GET` | `/timer` | Study timer page |
| `GET` | `/sessions` | Session history page |
| `GET` | `/dashboard` | Dashboard with stats & charts |

### REST API (JSON)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/subjects/add` | Add a new subject |
| `GET` | `/subjects/<id>` | Get subject details (for edit prefill) |
| `POST` | `/subjects/<id>/edit` | Update a subject |
| `POST` | `/subjects/<id>/delete` | Delete a subject (cascades to sessions) |
| `POST` | `/sessions/add` | Save a study session |
| `GET` | `/api/sessions` | List sessions (filterable: `?subject_id=`, `?date=`) |
| `GET` | `/api/sessions/<id>` | Get a single session |
| `DELETE` | `/api/sessions/<id>` | Delete a session |
| `GET` | `/api/dashboard/charts` | Aggregated chart data (daily, weekly, per-subject) |

---

## 🗄 Database Schema

```
┌──────────────────────────┐       ┌──────────────────────────────┐
│        subjects           │       │          sessions             │
├──────────────────────────┤       ├──────────────────────────────┤
│ id         INTEGER PK     │◄──┐  │ id          INTEGER PK        │
│ name       TEXT UNIQUE     │   │  │ subject_id  INTEGER FK ───────┘
│ color      TEXT (#rrggbb)  │   │  │ start_time  DATETIME          │
│ created_at DATETIME        │   │  │ end_time    DATETIME          │
└──────────────────────────┘   │  │ date        DATE              │
                                │  │ duration    INTEGER (minutes) │
                                │  │ notes       TEXT              │
                                │  │ created_at  DATETIME          │
                                │  └──────────────────────────────┘
                                │
                                └── ON DELETE CASCADE
```

**Additional schema features** (defined in `schema.sql`):
- Performance indexes on `subject_id`, `date`, and `start_time`
- Overlap-prevention trigger per subject per day
- `daily_summary` view — daily totals per subject
- `subject_totals` view — all-time totals per subject

---

## 📝 Development Log

### Work Completed

| # | Feature | Files Changed | Description |
|---|---------|---------------|-------------|
| 1 | **Subjects CRUD** | `app.py`, `subjects.html`, `subjects.css`, `subjects.js` | Full create/read/update/delete for study subjects with color pickers and sidebar form |
| 2 | **Study Timer** | `app.py`, `timer.html`, `timer.css`, `timer.js` | Pomodoro-style timer with SVG ring progress, mode pills (25/50/custom), session saving via fetch API |
| 3 | **Session History** | `app.py`, `sessions.html`, `sessions.css`, `sessions.js` | Sessions grouped by date, per-subject stat cards with progress bars, inline delete |
| 4 | **Sessions REST API** | `app.py` | Full JSON API: `GET /api/sessions` (filterable), `GET /api/sessions/<id>`, `DELETE /api/sessions/<id>` |
| 5 | **Dashboard — Stats & Cards** | `app.py`, `dashboard.html`, `dashboard.css`, `dashboard.js` | Dashboard page with 4 hero stat cards (today's time, session count, daily average, streak), 7-day CSS bar chart, top subject highlight, per-subject breakdown grid |
| 6 | **Dashboard — Chart.js Charts** | `app.py`, `dashboard.html`, `dashboard.css`, `dashboard.js` | Added `/api/dashboard/charts` API endpoint + 3 Chart.js charts: daily line chart (30 days), weekly bar chart (12 weeks), subject-wise horizontal bar (all-time) with custom dark-theme tooltips and gradient fills |
| 7 | **Cross-page Navigation** | `timer.html`, `sessions.html`, `timer.css` | Added 📊 Dashboard links to timer and sessions page navbars |

### Design Decisions

- **Dark theme throughout** — Background `#0c0c0f`, surface `#13131a`, electric lime `#c8f060` accent
- **Monospaced typography** — Azeret Mono for data-heavy UI, Instrument Serif for brand/nav accents
- **No build tools** — Pure HTML/CSS/JS with Jinja2 templating; Chart.js loaded via CDN
- **Server-side rendering + client-side charts** — Pages are rendered by Flask/Jinja2; charts fetch data from a dedicated JSON API for separation of concerns
- **Staggered animations** — Card entrance animations with incremental delays for a polished feel

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
