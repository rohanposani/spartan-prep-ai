import sqlite3
import os
import json
from datetime import datetime, date

DB_PATH = os.path.join(os.path.expanduser("~"), ".planner-app", "planner.db")

JOURNAL_QUESTIONS = [
    "What are you most grateful for today?",
    "What's one thing you learned recently that changed your perspective?",
    "How are you feeling emotionally right now, and why?",
    "What's a small win you had recently that you haven't celebrated?",
    "If you could tell your past self one thing, what would it be?",
    "What's something you're avoiding, and what's holding you back?",
    "Describe a moment today that made you smile.",
    "What's one habit you'd like to build or break?",
    "Who made a positive impact on your life recently?",
    "What does your ideal day look like one year from now?",
    "What's draining your energy lately, and how can you address it?",
    "Write about a challenge you're currently facing and one step to move through it.",
    "What's something you're proud of about yourself?",
    "How have you taken care of your mental health this week?",
    "What's a fear you'd like to overcome?",
    "Describe your current mood in three words and expand on each.",
    "What boundaries do you need to set or reinforce?",
    "What's one thing you want to let go of?",
    "How do you recharge, and when did you last do it?",
    "What would you attempt if you knew you couldn't fail?",
    "Write a letter to your future self about where you are now.",
    "What's a conversation you need to have but keep putting off?",
    "What does success mean to you right now?",
    "How has your definition of happiness changed over time?",
    "What's one area of your life that needs more attention?",
    "What are you looking forward to this week?",
    "Describe a person who inspires you and why.",
    "What's a mistake that taught you something valuable?",
    "How do you handle stress, and is it working?",
    "What would you do differently if you started today over?",
    "What's one kind thing you can do for yourself today?",
]


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            due_time TEXT NOT NULL,
            date TEXT NOT NULL,
            completed INTEGER DEFAULT 0,
            color TEXT DEFAULT '#2d6a4f',
            created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS journal (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT UNIQUE NOT NULL,
            question TEXT NOT NULL,
            entry TEXT DEFAULT '',
            created_at TEXT DEFAULT (datetime('now'))
        );
    """)
    conn.commit()
    conn.close()


def get_tasks(target_date):
    conn = get_db()
    tasks = conn.execute(
        "SELECT * FROM tasks WHERE date = ? ORDER BY due_time",
        (target_date,)
    ).fetchall()
    conn.close()
    return [dict(t) for t in tasks]


def add_task(title, due_time, target_date, color="#2d6a4f"):
    conn = get_db()
    conn.execute(
        "INSERT INTO tasks (title, due_time, date, color) VALUES (?, ?, ?, ?)",
        (title, due_time, target_date, color)
    )
    conn.commit()
    conn.close()


def update_task(task_id, **kwargs):
    conn = get_db()
    sets = ", ".join(f"{k} = ?" for k in kwargs)
    vals = list(kwargs.values()) + [task_id]
    conn.execute(f"UPDATE tasks SET {sets} WHERE id = ?", vals)
    conn.commit()
    conn.close()


def delete_task(task_id):
    conn = get_db()
    conn.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
    conn.commit()
    conn.close()


def get_journal(target_date):
    conn = get_db()
    entry = conn.execute(
        "SELECT * FROM journal WHERE date = ?", (target_date,)
    ).fetchone()
    if entry is None:
        day_of_year = date.fromisoformat(target_date).timetuple().tm_yday
        question = JOURNAL_QUESTIONS[day_of_year % len(JOURNAL_QUESTIONS)]
        conn.execute(
            "INSERT INTO journal (date, question) VALUES (?, ?)",
            (target_date, question)
        )
        conn.commit()
        entry = conn.execute(
            "SELECT * FROM journal WHERE date = ?", (target_date,)
        ).fetchone()
    conn.close()
    return dict(entry)


def save_journal(target_date, text):
    conn = get_db()
    conn.execute(
        "UPDATE journal SET entry = ? WHERE date = ?",
        (text, target_date)
    )
    conn.commit()
    conn.close()


def get_month_summary(year, month):
    """Return task counts and journal status for every day in a month."""
    start = f"{year:04d}-{month:02d}-01"
    end = f"{year:04d}-{month:02d}-31"
    conn = get_db()
    tasks = conn.execute(
        "SELECT date, COUNT(*) as total, SUM(completed) as done "
        "FROM tasks WHERE date >= ? AND date <= ? GROUP BY date",
        (start, end),
    ).fetchall()
    journals = conn.execute(
        "SELECT date, (entry != '' AND entry IS NOT NULL) as has_entry "
        "FROM journal WHERE date >= ? AND date <= ?",
        (start, end),
    ).fetchall()
    conn.close()

    summary = {}
    for t in tasks:
        summary[t["date"]] = {"tasks": t["total"], "done": t["done"] or 0}
    for j in journals:
        d = j["date"]
        if d not in summary:
            summary[d] = {"tasks": 0, "done": 0}
        summary[d]["journal"] = bool(j["has_entry"])
    return summary
