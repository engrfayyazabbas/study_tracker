# CLAUDE.md — Personal Study Tracker (Quick Reference)

> Read this file first. It gives a complete picture of the project so you don't
> need to re-read every source file from scratch each session.

---

## 1. Project Overview

A **Flask + SQLite** web app that lets a student track study sessions.
`run.py` starts the server. The entry-point is `app.py`.

```
run.py          → python run.py  (initialises DB then starts Flask dev server)
app.py          → all routes (Flask)
database.py     → get_db() + init_db() helpers
schema.sql      → DB schema (subjects, sessions tables)
study_tracker.db→ SQLite database file
```

---

## 2. Database Schema (`schema.sql`)

### `subjects`
| Column     | Type    | Notes                  |
|------------|---------|------------------------|
| id         | INTEGER | PRIMARY KEY AUTOINCREMENT |
| name       | TEXT    | UNIQUE, NOT NULL       |
| color      | TEXT    | hex color e.g. #4A90D9 |
| created_at | TEXT    | default CURRENT_TIMESTAMP |

### `sessions`
| Column     | Type    | Notes                              |
|------------|---------|------------------------------------|
| id         | INTEGER | PRIMARY KEY AUTOINCREMENT          |
| subject_id | INTEGER | FK → subjects.id                   |
| start_time | TEXT    | "YYYY-MM-DD HH:MM:SS"             |
| end_time   | TEXT    | "YYYY-MM-DD HH:MM:SS"             |
| date       | TEXT    | "YYYY-MM-DD" (index for filtering) |
| duration   | INTEGER | minutes                            |
| notes      | TEXT    | optional                           |

---

## 3. All Routes (`app.py`)

### Pages (render HTML templates)
| Method | URL         | Function            | Template          | Context passed                                   |
|--------|-------------|---------------------|-------------------|--------------------------------------------------|
| GET    | `/`         | `index`             | `subjects.html`   | `subjects`                                       |
| GET    | `/timer`    | `timer`             | `timer.html`      | `subjects`, `sessions` (today), `total_today`, `streak` |
| GET    | `/sessions` | `sessions_history`  | `sessions.html`   | `subjects` (dict list!), `stats`, `by_date`, `total_all` |
| GET    | `/dashboard`| `dashboard`         | `dashboard.html`  | `today_sessions`, `today_minutes`, `avg_daily`, `streak`, `top_subject`, `subjects`, `week`, `total_all` |

### Subject CRUD
| Method | URL                            | Function         |
|--------|--------------------------------|------------------|
| POST   | `/subjects/add`                | `add_subject`    |
| GET    | `/subjects/<id>`               | `get_subject`    |
| POST   | `/subjects/<id>/edit`          | `edit_subject`   |
| POST   | `/subjects/<id>/delete`        | `delete_subject` |

### Sessions API (JSON)
| Method | URL                        | Function                 | Notes                                       |
|--------|----------------------------|--------------------------|---------------------------------------------|
| POST   | `/sessions/add`            | `add_session`            | timer JS calls this; expects ISO timestamps |
| GET    | `/api/sessions`            | `api_get_sessions`       | `?subject_id=` `?date=` optional filters    |
| GET    | `/api/sessions/<id>`       | `api_get_session`        |                                             |
| POST   | `/api/sessions/manual`     | `api_add_manual_session` | manual entry: date, HH:MM start, minutes    |
| DELETE | `/api/sessions/<id>`       | `api_delete_session`     |                                             |

### Dashboard Charts
| Method | URL                      | Function               |
|--------|--------------------------|------------------------|
| GET    | `/api/dashboard/charts`  | `api_dashboard_charts` | Returns `daily`, `weekly`, `subjects` chart data |

---

## 4. Templates (`templates/`)

All extend **`base.html`** which provides:
- Global top header navigation (sticky, glassmorphism) with mobile dropdown.
- **`.app-main`** and **`.content-wrapper`** layout flow.
- Global Deep Space Dark Mode glassmorphism rules.
- `{% block title %}`, `{% block styles %}`, `{% block content %}`, `{% block scripts %}`

| Template         | Page        | Loads these static files                          |
|------------------|-------------|---------------------------------------------------|
| `base.html`      | (layout)    | `style.css`, `header.css`, `header.js`            |
| `subjects.html`  | Subjects    | `subjects.css`, `subjects.js`                     |
| `timer.html`     | Timer       | `timer.css`, `timer.js`, `mini-timer.css`, `mini-timer.js` |
| `sessions.html`  | Sessions    | `timer.css`, `sessions.css`, `sessions.js`, `mini-timer.css`, `mini-timer.js` |
| `dashboard.html` | Dashboard   | `dashboard.css`, `dashboard.js`                   |

---

## 5. Static Files (`static/`)

### CSS
| File            | Purpose                                                      |
|-----------------|--------------------------------------------------------------|
| `style.css`     | Global reset, CSS variables (dark theme tokens), app container layout |
| `header.css`    | Horizontal top navigation bar + mobile dropdown              |
| `timer.css`     | Timer page + shared CSS vars used by sessions.css too        |
| `sessions.css`  | Sessions page, stats strip, history list, modal styles       |
| `subjects.css`  | Subject cards, add/edit form                                 |
| `dashboard.css` | Dashboard cards, chart containers                            |
| `mini-timer.css`| Floating mini-timer widget (used on sessions page)           |

### CSS Variables (defined in `style.css`)
Current theme uses "Silicon Deep Space" dark mode style.
```css
--bg           /* Deep black base (#09090b) */
--surface      /* Glassmorphism card surface */
--border       /* Translucent crisp border */
--accent       /* Luminous lime/green */
--accent2      /* Sharp sky blue */
--text         /* Primary white/off-white text */
--text-muted   /* Secondary muted gray text */
--font-sans    /* Inter font stack */
--font-mono    /* JetBrains Mono */
```

### Bento Grid Framework
The UI relies heavily on a responsive grid system. To add structured components:
- Wrap cards in `<div class="bento-wrapper">`
- Use `<div class="bento-card">` for layout items
- Append `.col-span-2` to make a component stretch twice as wide
- **Gotcha:** The `.col-span-2` class must be defined in the page-specific CSS (e.g., `sessions.css`, `dashboard.css`). If containers look unequal, ensure `.col-span-2 { grid-column: span 2; }` is included.

### Dashboard Layout Rules
- The `week-section` (Last 7 Days bar chart) uses `.col-span-2` to span the full bento grid width.
- The three chart cards (`chartDailyCard`, `chartWeeklyCard`, `chartSubjectsCard`) are **independent siblings** inside `.bento-wrapper` — do NOT nest them inside `week-section`.
- `week-section` uses `display: flex; flex-direction: column` to stack its title and bar chart vertically.
- `chart-card--wide` spans 2 columns (the Subject-wise chart).

### Select / Dropdown Styling
- All `<select>` and `<option>` elements use `background: var(--bg)` to match the page background.
- Avoid `var(--surface)` for `option` backgrounds — it is a translucent rgba value that browsers cannot render in native dropdown menus, causing a white fallback.

### JavaScript
| File            | Purpose                                                                 |
|-----------------|-------------------------------------------------------------------------|
| `header.js`     | Toggle mobile dropdown menu logic                                       |
| `timer.js`      | Stopwatch logic, subject select, POST to `/sessions/add`, today list    |
| `sessions.js`   | Delete session (DELETE API), manual-session modal (POST `/api/sessions/manual`), live DOM inject |
| `subjects.js`   | Inline edit/delete subject cards                                         |
| `dashboard.js`  | Fetches `/api/dashboard/charts`, renders Chart.js charts                 |
| `mini-timer.js` | Floating mini-timer synced with timer page via `/api/timer/state`        |

---

## 6. Key Patterns & Gotchas

### ⚠️ SQLite Row → JSON
`conn.execute(...).fetchall()` returns `sqlite3.Row` objects.
- **Templates**: iterate fine (`{{ s['name'] }}`) — no issue.
- **`tojson` filter**: will **crash** with `TypeError: Object of type Row is not JSON serializable`.
- **Fix**: always convert before passing if `tojson` will be used:
  ```python
  subjects = [dict(r) for r in conn.execute("SELECT ...").fetchall()]
  ```
  This is already done in `sessions_history()` for `subjects`.

### Timer → Sessions sync
- Timer JS calls `POST /sessions/add` with a JSON body containing ISO 8601 timestamps.
- `add_session()` parses them with `datetime.fromisoformat()` and stores as `YYYY-MM-DD HH:MM:SS`.

### Manual Session (`/api/sessions/manual`)
- Accepts: `{ subject_id, date (YYYY-MM-DD), start_time (HH:MM), duration_minutes, notes }`
- Computes `end_time = start_time + duration_minutes` server-side.
- Returns new session row as JSON; JS injects it into the DOM without reload.

### Streak Calculation
Both `timer()` and `dashboard()` compute streak the same way:
```python
dates    = conn.execute("SELECT DISTINCT date FROM sessions ORDER BY date DESC").fetchall()
date_set = {r["date"] for r in dates}
streak   = 0
check    = date.today()
while check.isoformat() in date_set:
    streak += 1
    check  -= timedelta(days=1)
```

### Mini-Timer
`mini-timer.js` polls a `/api/timer/state` endpoint (defined somewhere in app.py or extension/)
to keep the floating overlay in sync with the main timer tab.

---

## 7. File Change Checklist

When adding a new **page**:
- [ ] Add route in `app.py` returning `render_template(...)`
- [ ] Create `templates/<name>.html` extending `base.html`
- [ ] Add `<name>.css` and `<name>.js` in `static/`
- [ ] Link them in the template's `{% block styles %}` / `{% block scripts %}`
- [ ] Ensure `<nav>` link is added to `base.html` tracking `request.path`

When adding a new **API endpoint**:
- [ ] Add route in `app.py` returning `jsonify(...)`
- [ ] Return `{"ok": True, ...}` on success, `{"ok": False, "error": "..."}` on failure
- [ ] Static routes (e.g. `/api/sessions/manual`) must come **before** parameterised routes (e.g. `/api/sessions/<int:id>`) to avoid Flask matching conflicts

When modifying **sessions**:
- [ ] `sessions_history()` must pass `subjects` as `[dict(r) for r in ...]` (not raw Rows)
- [ ] Session duration is always stored in **minutes** (integer)
- [ ] `date` column is always `YYYY-MM-DD` string

---

## 8. Running the App

```powershell
# From the Web/ directory
python run.py
# → http://127.0.0.1:5000
```

`run.py` calls `init_db()` first (creates tables if not exist), then `app.run(debug=True)`.
