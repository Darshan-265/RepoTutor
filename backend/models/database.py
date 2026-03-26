"""
Database Models — SQLite schema + CRUD helpers
"""
import sqlite3, uuid, hashlib
from datetime import datetime
from backend.config import DB_PATH


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id            TEXT PRIMARY KEY,
                email         TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                name          TEXT DEFAULT '',
                avatar_color  TEXT DEFAULT '#6c63ff',
                plan          TEXT DEFAULT 'free',
                created_at    TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS repositories (
                id           TEXT PRIMARY KEY,
                user_id      TEXT NOT NULL,
                github_url   TEXT NOT NULL,
                owner        TEXT NOT NULL,
                name         TEXT NOT NULL,
                description  TEXT,
                summary      TEXT,
                file_list    TEXT,
                context      TEXT,
                file_count   INTEGER DEFAULT 0,
                language     TEXT DEFAULT '',
                stars        INTEGER DEFAULT 0,
                created_at   TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );
            CREATE TABLE IF NOT EXISTS messages (
                id         TEXT PRIMARY KEY,
                repo_id    TEXT NOT NULL,
                role       TEXT NOT NULL,
                content    TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (repo_id) REFERENCES repositories(id)
            );
            CREATE TABLE IF NOT EXISTS bookmarks (
                id         TEXT PRIMARY KEY,
                user_id    TEXT NOT NULL,
                repo_id    TEXT NOT NULL,
                repo_name  TEXT NOT NULL,
                question   TEXT NOT NULL,
                answer     TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS question_stats (
                id         TEXT PRIMARY KEY,
                user_id    TEXT NOT NULL,
                repo_id    TEXT NOT NULL,
                question   TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS user_preferences (
                user_id TEXT PRIMARY KEY,
                theme   TEXT DEFAULT 'dark'
            );
            CREATE TABLE IF NOT EXISTS health_scores (
                id         TEXT PRIMARY KEY,
                repo_id    TEXT NOT NULL,
                user_id    TEXT NOT NULL,
                score      INTEGER DEFAULT 0,
                breakdown  TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (repo_id) REFERENCES repositories(id)
            );
        """)
        # Migrate existing DBs — safely add new columns/tables if missing
        migrations = [
            "ALTER TABLE users ADD COLUMN plan TEXT DEFAULT 'free'",
            """CREATE TABLE IF NOT EXISTS health_scores (
                id TEXT PRIMARY KEY, repo_id TEXT NOT NULL, user_id TEXT NOT NULL,
                score INTEGER DEFAULT 0, breakdown TEXT, created_at TEXT NOT NULL)""",
        ]
        for sql in migrations:
            try:
                conn.execute(sql)
            except Exception:
                pass   # already exists


def hash_password(p): return hashlib.sha256(p.encode()).hexdigest()

def create_user(email, password):
    uid = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    with get_db() as conn:
        conn.execute("INSERT INTO users VALUES (?,?,?,?,?,?,?)",
                     (uid, email.lower().strip(), hash_password(password), '', '#6c63ff', 'free', now))
        conn.execute("INSERT OR IGNORE INTO user_preferences VALUES (?,?)", (uid, 'dark'))
    return {"id": uid, "email": email}

def get_user_by_email(email):
    with get_db() as conn:
        return conn.execute("SELECT * FROM users WHERE email=?", (email.lower().strip(),)).fetchone()

def verify_user(email, password):
    with get_db() as conn:
        return conn.execute("SELECT * FROM users WHERE email=? AND password_hash=?",
                            (email.lower().strip(), hash_password(password))).fetchone()

def get_user_by_id(uid):
    with get_db() as conn:
        return conn.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()

def update_user_profile(uid, name, avatar_color):
    with get_db() as conn:
        conn.execute("UPDATE users SET name=?, avatar_color=? WHERE id=?", (name, avatar_color, uid))

def update_user_password(uid, new_password):
    with get_db() as conn:
        conn.execute("UPDATE users SET password_hash=? WHERE id=?", (hash_password(new_password), uid))

def verify_user_password(uid, password):
    with get_db() as conn:
        row = conn.execute("SELECT password_hash FROM users WHERE id=?", (uid,)).fetchone()
        return row and row["password_hash"] == hash_password(password)

def get_preference(uid):
    with get_db() as conn:
        row = conn.execute("SELECT * FROM user_preferences WHERE user_id=?", (uid,)).fetchone()
        return dict(row) if row else {"theme": "dark"}

def set_preference(uid, key, value):
    with get_db() as conn:
        conn.execute(f"UPDATE user_preferences SET {key}=? WHERE user_id=?", (value, uid))

def create_repository(user_id, github_url, owner, name, description,
                      summary, file_list_json, context, file_count, language='', stars=0):
    repo_id = str(uuid.uuid4())
    now     = datetime.utcnow().isoformat()
    with get_db() as conn:
        conn.execute("INSERT INTO repositories VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
                     (repo_id, user_id, github_url, owner, name, description,
                      summary, file_list_json, context, file_count, language, stars, now))
    return repo_id

def get_repos_by_user(uid):
    with get_db() as conn:
        rows = conn.execute(
            "SELECT id,github_url,owner,name,description,summary,file_list,"
            "file_count,language,stars,created_at FROM repositories "
            "WHERE user_id=? ORDER BY created_at DESC", (uid,)
        ).fetchall()
    return [dict(r) for r in rows]

def get_repo_by_id(repo_id, uid):
    with get_db() as conn:
        row = conn.execute("SELECT * FROM repositories WHERE id=? AND user_id=?", (repo_id, uid)).fetchone()
    return dict(row) if row else None

def delete_repository(repo_id, uid):
    with get_db() as conn:
        conn.execute("DELETE FROM messages      WHERE repo_id=?", (repo_id,))
        conn.execute("DELETE FROM bookmarks     WHERE repo_id=?", (repo_id,))
        conn.execute("DELETE FROM question_stats WHERE repo_id=?", (repo_id,))
        conn.execute("DELETE FROM health_scores  WHERE repo_id=?", (repo_id,))
        conn.execute("DELETE FROM repositories  WHERE id=? AND user_id=?", (repo_id, uid))

def save_message(repo_id, role, content):
    with get_db() as conn:
        conn.execute("INSERT INTO messages VALUES (?,?,?,?,?)",
                     (str(uuid.uuid4()), repo_id, role, content, datetime.utcnow().isoformat()))

def get_messages(repo_id):
    with get_db() as conn:
        rows = conn.execute(
            "SELECT role,content,created_at FROM messages WHERE repo_id=? ORDER BY created_at",
            (repo_id,)
        ).fetchall()
    return [dict(r) for r in rows]

def get_recent_messages(repo_id, limit=6):
    with get_db() as conn:
        rows = conn.execute(
            "SELECT role,content FROM messages WHERE repo_id=? ORDER BY created_at DESC LIMIT ?",
            (repo_id, limit)
        ).fetchall()
    return [{"role": r["role"], "content": r["content"]} for r in reversed(rows)]

def clear_messages(repo_id):
    with get_db() as conn:
        conn.execute("DELETE FROM messages WHERE repo_id=?", (repo_id,))

def save_bookmark(uid, repo_id, repo_name, question, answer):
    with get_db() as conn:
        conn.execute("INSERT INTO bookmarks VALUES (?,?,?,?,?,?,?)",
                     (str(uuid.uuid4()), uid, repo_id, repo_name,
                      question, answer, datetime.utcnow().isoformat()))

def get_bookmarks(uid):
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM bookmarks WHERE user_id=? ORDER BY created_at DESC", (uid,)).fetchall()
    return [dict(r) for r in rows]

def delete_bookmark(bid, uid):
    with get_db() as conn:
        conn.execute("DELETE FROM bookmarks WHERE id=? AND user_id=?", (bid, uid))

def log_question(uid, repo_id, question):
    with get_db() as conn:
        conn.execute("INSERT INTO question_stats VALUES (?,?,?,?,?)",
                     (str(uuid.uuid4()), uid, repo_id, question, datetime.utcnow().isoformat()))

def get_top_questions(uid, repo_id, limit=5):
    with get_db() as conn:
        rows = conn.execute(
            "SELECT question, COUNT(*) as count FROM question_stats "
            "WHERE user_id=? AND repo_id=? GROUP BY question ORDER BY count DESC LIMIT ?",
            (uid, repo_id, limit)
        ).fetchall()
    return [dict(r) for r in rows]

def get_question_count_by_repo(uid):
    with get_db() as conn:
        rows = conn.execute(
            "SELECT repo_id, COUNT(*) as count FROM question_stats WHERE user_id=? GROUP BY repo_id",
            (uid,)
        ).fetchall()
    return {r["repo_id"]: r["count"] for r in rows}