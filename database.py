import sqlite3

DATABASE = "study_tracker.db"


def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS subjects (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            name       TEXT    NOT NULL UNIQUE,
            color      TEXT    NOT NULL DEFAULT '#4A90D9',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS sessions (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
            start_time DATETIME NOT NULL,
            end_time   DATETIME NOT NULL,
            date       DATE     NOT NULL,
            duration   INTEGER  NOT NULL CHECK (duration > 0),
            notes      TEXT     DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            CHECK (end_time > start_time)
        );
    """)
    conn.commit()
    conn.close()
