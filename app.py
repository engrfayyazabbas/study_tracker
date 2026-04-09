from flask import Flask, render_template, request, redirect, url_for, jsonify
from database import init_db, get_db
from datetime import datetime, date

app = Flask(__name__)


# ── Subjects: homepage ────────────────────────────────────────────────────────
@app.route("/")
def index():
    conn = get_db()
    subjects = conn.execute(
        "SELECT * FROM subjects ORDER BY created_at DESC"
    ).fetchall()
    conn.close()
    return render_template("subjects.html", subjects=subjects)


# ── Subjects: add ─────────────────────────────────────────────────────────────
@app.route("/subjects/add", methods=["POST"])
def add_subject():
    name  = request.form.get("name",  "").strip()
    color = request.form.get("color", "#4A90D9").strip()
    if name:
        conn = get_db()
        try:
            conn.execute("INSERT INTO subjects (name, color) VALUES (?, ?)", (name, color))
            conn.commit()
        except Exception:
            pass
        finally:
            conn.close()
    return redirect(url_for("index"))


# ── Subjects: get (for edit prefill) ─────────────────────────────────────────
@app.route("/subjects/<int:subject_id>", methods=["GET"])
def get_subject(subject_id):
    conn = get_db()
    row  = conn.execute("SELECT * FROM subjects WHERE id = ?", (subject_id,)).fetchone()
    conn.close()
    if row is None:
        return jsonify({"error": "Not found"}), 404
    return jsonify({"id": row["id"], "name": row["name"], "color": row["color"]})


# ── Subjects: edit ────────────────────────────────────────────────────────────
@app.route("/subjects/<int:subject_id>/edit", methods=["POST"])
def edit_subject(subject_id):
    name  = request.form.get("name",  "").strip()
    color = request.form.get("color", "#4A90D9").strip()
    if name:
        conn = get_db()
        conn.execute("UPDATE subjects SET name = ?, color = ? WHERE id = ?", (name, color, subject_id))
        conn.commit()
        conn.close()
    return redirect(url_for("index"))


# ── Subjects: delete ──────────────────────────────────────────────────────────
@app.route("/subjects/<int:subject_id>/delete", methods=["POST"])
def delete_subject(subject_id):
    conn = get_db()
    conn.execute("DELETE FROM subjects WHERE id = ?", (subject_id,))
    conn.commit()
    conn.close()
    return redirect(url_for("index"))


# ── Timer page ────────────────────────────────────────────────────────────────
@app.route("/timer")
def timer():
    from datetime import timedelta
    conn     = get_db()
    today    = date.today().isoformat()

    subjects = conn.execute(
        "SELECT * FROM subjects ORDER BY name"
    ).fetchall()

    sessions = conn.execute("""
        SELECT s.*, sub.name AS subject_name, sub.color
        FROM sessions s
        JOIN subjects sub ON sub.id = s.subject_id
        WHERE s.date = ?
        ORDER BY s.start_time DESC
    """, (today,)).fetchall()

    row = conn.execute(
        "SELECT COALESCE(SUM(duration), 0) AS total FROM sessions WHERE date = ?",
        (today,)
    ).fetchone()
    total_today = row["total"]

    # ── Streak (consecutive study days ending today) ─────────────────────────
    dates    = conn.execute(
        "SELECT DISTINCT date FROM sessions ORDER BY date DESC"
    ).fetchall()
    date_set = {r["date"] for r in dates}
    streak   = 0
    check    = date.today()
    while check.isoformat() in date_set:
        streak += 1
        check  -= timedelta(days=1)

    conn.close()
    return render_template("timer.html",
                           subjects=subjects,
                           sessions=sessions,
                           total_today=total_today,
                           streak=streak)


# ── Sessions: save (called by JS fetch) ──────────────────────────────────────
@app.route("/sessions/add", methods=["POST"])
def add_session():
    data = request.get_json()

    subject_id = data.get("subject_id")
    start_str  = data.get("start_time")
    end_str    = data.get("end_time")
    duration   = data.get("duration", 0)
    notes      = data.get("notes", "")

    if not subject_id or not start_str or not end_str or duration < 1:
        return jsonify({"ok": False, "error": "Missing or invalid fields"}), 400

    try:
        start_dt  = datetime.fromisoformat(start_str.replace("Z", "+00:00"))
        end_dt    = datetime.fromisoformat(end_str.replace("Z", "+00:00"))
        start_fmt = start_dt.strftime("%Y-%m-%d %H:%M:%S")
        end_fmt   = end_dt.strftime("%Y-%m-%d %H:%M:%S")
        date_fmt  = start_dt.strftime("%Y-%m-%d")

        conn = get_db()
        cur  = conn.execute("""
            INSERT INTO sessions (subject_id, start_time, end_time, date, duration, notes)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (subject_id, start_fmt, end_fmt, date_fmt, duration, notes))
        conn.commit()
        new_id = cur.lastrowid

        row = conn.execute("""
            SELECT s.*, sub.name AS subject_name, sub.color
            FROM sessions s
            JOIN subjects sub ON sub.id = s.subject_id
            WHERE s.id = ?
        """, (new_id,)).fetchone()
        conn.close()

        return jsonify({"ok": True, "session": dict(row)})

    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


# ── Sessions: GET all (JSON API) ─────────────────────────────────────────────
@app.route("/api/sessions", methods=["GET"])
def api_get_sessions():
    """
    GET /api/sessions
    Optional query params:
      ?subject_id=1   filter by subject
      ?date=2024-06-01  filter by date
    Returns JSON list of sessions with subject name + color.
    """
    subject_id = request.args.get("subject_id")
    filter_date = request.args.get("date")

    query  = """
        SELECT s.id, s.subject_id, sub.name AS subject_name, sub.color,
               s.duration, s.start_time, s.end_time, s.date, s.notes
        FROM sessions s
        JOIN subjects sub ON sub.id = s.subject_id
        WHERE 1=1
    """
    params = []

    if subject_id:
        query += " AND s.subject_id = ?"
        params.append(subject_id)
    if filter_date:
        query += " AND s.date = ?"
        params.append(filter_date)

    query += " ORDER BY s.date DESC, s.start_time DESC"

    conn = get_db()
    rows = conn.execute(query, params).fetchall()
    conn.close()

    return jsonify({"ok": True, "count": len(rows), "sessions": [dict(r) for r in rows]})


# ── Sessions: GET one (JSON API) ─────────────────────────────────────────────
@app.route("/api/sessions/<int:session_id>", methods=["GET"])
def api_get_session(session_id):
    """GET /api/sessions/<id> — return a single session."""
    conn = get_db()
    row  = conn.execute("""
        SELECT s.*, sub.name AS subject_name, sub.color
        FROM sessions s
        JOIN subjects sub ON sub.id = s.subject_id
        WHERE s.id = ?
    """, (session_id,)).fetchone()
    conn.close()
    if row is None:
        return jsonify({"ok": False, "error": "Session not found"}), 404
    return jsonify({"ok": True, "session": dict(row)})


# ── Sessions: DELETE one ──────────────────────────────────────────────────────
@app.route("/api/sessions/<int:session_id>", methods=["DELETE"])
def api_delete_session(session_id):
    conn = get_db()
    conn.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
    conn.commit()
    conn.close()
    return jsonify({"ok": True, "deleted": session_id})


# ── Sessions history page ─────────────────────────────────────────────────────
@app.route("/sessions")
def sessions_history():
    conn      = get_db()
    subjects  = conn.execute("SELECT * FROM subjects ORDER BY name").fetchall()

    # Aggregate: total minutes and session count per subject
    stats = conn.execute("""
        SELECT sub.id, sub.name, sub.color,
               COUNT(s.id)            AS session_count,
               COALESCE(SUM(s.duration), 0) AS total_minutes
        FROM subjects sub
        LEFT JOIN sessions s ON s.subject_id = sub.id
        GROUP BY sub.id
        ORDER BY total_minutes DESC
    """).fetchall()

    # All sessions grouped by date
    sessions = conn.execute("""
        SELECT s.*, sub.name AS subject_name, sub.color
        FROM sessions s
        JOIN subjects sub ON sub.id = s.subject_id
        ORDER BY s.date DESC, s.start_time DESC
    """).fetchall()

    # Group sessions by date for the template
    from collections import defaultdict
    by_date = defaultdict(list)
    for row in sessions:
        by_date[row["date"]].append(dict(row))

    # Total all-time minutes
    row = conn.execute("SELECT COALESCE(SUM(duration),0) AS t FROM sessions").fetchone()
    total_all = row["t"]

    conn.close()
    return render_template("sessions.html",
                           stats=stats,
                           by_date=dict(by_date),
                           total_all=total_all)


# ── Dashboard ─────────────────────────────────────────────────────────────────
@app.route("/dashboard")
def dashboard():
    conn  = get_db()
    today = date.today().isoformat()

    # ── Today's stats ────────────────────────────────────────────────────────
    row = conn.execute("""
        SELECT COUNT(*) AS cnt,
               COALESCE(SUM(duration), 0) AS total
        FROM sessions WHERE date = ?
    """, (today,)).fetchone()
    today_sessions = row["cnt"]
    today_minutes  = row["total"]

    # ── Average daily study time ─────────────────────────────────────────────
    row = conn.execute("""
        SELECT COUNT(DISTINCT date) AS days,
               COALESCE(SUM(duration), 0) AS total
        FROM sessions
    """).fetchone()
    study_days   = row["days"] or 1
    avg_daily    = round(row["total"] / study_days)

    # ── Streak (consecutive days ending today) ───────────────────────────────
    dates = conn.execute("""
        SELECT DISTINCT date FROM sessions ORDER BY date DESC
    """).fetchall()

    streak = 0
    from datetime import timedelta
    check  = date.today()
    date_set = {r["date"] for r in dates}

    while check.isoformat() in date_set:
        streak += 1
        check  -= timedelta(days=1)

    # ── Top subject today ────────────────────────────────────────────────────
    top = conn.execute("""
        SELECT sub.name, sub.color, SUM(s.duration) AS mins
        FROM sessions s
        JOIN subjects sub ON sub.id = s.subject_id
        WHERE s.date = ?
        GROUP BY s.subject_id
        ORDER BY mins DESC LIMIT 1
    """, (today,)).fetchone()

    top_subject = dict(top) if top else None

    # ── Per-subject breakdown (all time) ─────────────────────────────────────
    subjects = conn.execute("""
        SELECT sub.id, sub.name, sub.color,
               COUNT(s.id)                  AS session_count,
               COALESCE(SUM(s.duration), 0) AS total_minutes
        FROM subjects sub
        LEFT JOIN sessions s ON s.subject_id = sub.id
        GROUP BY sub.id
        ORDER BY total_minutes DESC
    """).fetchall()

    # ── Recent 7-day activity (for sparkline) ────────────────────────────────
    week_data = conn.execute("""
        SELECT date, SUM(duration) AS mins
        FROM sessions
        WHERE date >= date('now', '-6 days')
        GROUP BY date
        ORDER BY date ASC
    """).fetchall()

    week_map = {r["date"]: r["mins"] for r in week_data}
    week = []
    for i in range(6, -1, -1):
        d = (date.today() - timedelta(days=i)).isoformat()
        week.append({"date": d, "mins": week_map.get(d, 0)})

    # ── Total all-time ───────────────────────────────────────────────────────
    row = conn.execute("SELECT COALESCE(SUM(duration),0) AS t FROM sessions").fetchone()
    total_all = row["t"]

    conn.close()
    return render_template("dashboard.html",
                           today_sessions=today_sessions,
                           today_minutes=today_minutes,
                           avg_daily=avg_daily,
                           streak=streak,
                           top_subject=top_subject,
                           subjects=subjects,
                           week=week,
                           total_all=total_all)


# ── Dashboard Charts API ──────────────────────────────────────────────────────
@app.route("/api/dashboard/charts")
def api_dashboard_charts():
    """
    GET /api/dashboard/charts
    Returns aggregated data for three Chart.js charts:
      1. daily   – last 30 days of study time
      2. weekly  – last 12 weeks of study time
      3. subjects – total time per subject (all time)
    """
    from datetime import timedelta

    conn = get_db()

    # ── 1. Daily study time (last 30 days) ───────────────────────────────────
    daily_rows = conn.execute("""
        SELECT date, SUM(duration) AS mins
        FROM sessions
        WHERE date >= date('now', '-29 days')
        GROUP BY date
        ORDER BY date ASC
    """).fetchall()

    daily_map = {r["date"]: r["mins"] for r in daily_rows}
    daily_labels = []
    daily_data   = []
    for i in range(29, -1, -1):
        d = (date.today() - timedelta(days=i)).isoformat()
        daily_labels.append(d[5:])        # "MM-DD"
        daily_data.append(daily_map.get(d, 0))

    # ── 2. Weekly study time (last 12 weeks) ─────────────────────────────────
    #    Each week = Mon–Sun. We walk back 12 weeks from current week start.
    today_dt = date.today()
    # Monday of current week
    week_start = today_dt - timedelta(days=today_dt.weekday())

    weekly_labels = []
    weekly_data   = []
    for w in range(11, -1, -1):
        ws = week_start - timedelta(weeks=w)
        we = ws + timedelta(days=6)
        row = conn.execute("""
            SELECT COALESCE(SUM(duration), 0) AS mins
            FROM sessions
            WHERE date >= ? AND date <= ?
        """, (ws.isoformat(), we.isoformat())).fetchone()
        weekly_labels.append(ws.strftime("%b %d"))
        weekly_data.append(row["mins"])

    # ── 3. Subject-wise time (all time) ──────────────────────────────────────
    subj_rows = conn.execute("""
        SELECT sub.name, sub.color,
               COALESCE(SUM(s.duration), 0) AS total_minutes
        FROM subjects sub
        LEFT JOIN sessions s ON s.subject_id = sub.id
        GROUP BY sub.id
        ORDER BY total_minutes DESC
    """).fetchall()

    subj_labels = [r["name"]          for r in subj_rows]
    subj_data   = [r["total_minutes"] for r in subj_rows]
    subj_colors = [r["color"]         for r in subj_rows]

    conn.close()

    return jsonify({
        "ok": True,
        "daily":    {"labels": daily_labels,   "data": daily_data},
        "weekly":   {"labels": weekly_labels,  "data": weekly_data},
        "subjects": {"labels": subj_labels, "data": subj_data, "colors": subj_colors}
    })


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    init_db()
    app.run(debug=True)
