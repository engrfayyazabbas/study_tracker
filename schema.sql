-- ============================================================
--  Study Tracker – SQLite Schema
--  Run once to initialise the database:
--      sqlite3 study_tracker.db < schema.sql
-- ============================================================

PRAGMA foreign_keys = ON;   -- enforce FK relationships in SQLite


-- ── 1. Subjects ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subjects (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL UNIQUE,          -- no duplicate subject names
    color      TEXT    NOT NULL DEFAULT '#4A90D9' -- hex color for UI
                       CHECK (color LIKE '#______'),  -- must be valid hex (#rrggbb)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);


-- ── 2. Sessions ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Foreign key → subjects
    subject_id INTEGER NOT NULL
               REFERENCES subjects(id)
               ON DELETE CASCADE,               -- delete sessions if subject deleted

    -- Time bounds
    start_time DATETIME NOT NULL,
    end_time   DATETIME NOT NULL,
    date       DATE     NOT NULL,               -- store date separately for fast daily queries

    -- Derived but stored for quick aggregation
    duration   INTEGER  NOT NULL                -- duration in minutes
               CHECK (duration > 0),            -- ✅ NO negative / zero duration

    notes      TEXT     DEFAULT '',

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- ── Constraints ────────────────────────────────────────────────────────
    CHECK (end_time > start_time)               -- end must be after start
);


-- ── Indexes (speed up common queries) ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sessions_subject  ON sessions(subject_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date     ON sessions(date);
CREATE INDEX IF NOT EXISTS idx_sessions_time     ON sessions(start_time, end_time);


-- ── Overlap-prevention trigger ────────────────────────────────────────────────
-- Raises an error if a new session overlaps with any existing session
-- for the SAME subject on the same day.
CREATE TRIGGER IF NOT EXISTS prevent_overlap
BEFORE INSERT ON sessions
BEGIN
    SELECT RAISE(ABORT, 'Session overlaps with an existing session for this subject')
    WHERE EXISTS (
        SELECT 1 FROM sessions
        WHERE  subject_id = NEW.subject_id
        AND    date       = NEW.date
        AND    id        != COALESCE(NEW.id, -1)   -- skip self on UPDATE
        AND    NEW.start_time < end_time            -- new starts before existing ends
        AND    NEW.end_time   > start_time          -- new ends   after  existing starts
    );
END;


-- ── Useful views ──────────────────────────────────────────────────────────────

-- Daily totals per subject
CREATE VIEW IF NOT EXISTS daily_summary AS
SELECT
    s.date,
    sub.name            AS subject,
    sub.color,
    COUNT(*)            AS session_count,
    SUM(s.duration)     AS total_minutes
FROM sessions s
JOIN subjects sub ON sub.id = s.subject_id
GROUP BY s.date, s.subject_id;


-- All-time totals per subject
CREATE VIEW IF NOT EXISTS subject_totals AS
SELECT
    sub.id,
    sub.name,
    sub.color,
    COUNT(s.id)         AS total_sessions,
    COALESCE(SUM(s.duration), 0) AS total_minutes
FROM subjects sub
LEFT JOIN sessions s ON s.subject_id = sub.id
GROUP BY sub.id;
