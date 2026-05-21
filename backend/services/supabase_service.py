import os
import uuid
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

_DB_PATH = Path(__file__).parent.parent / "data.db"


def _is_supabase() -> bool:
    url = os.getenv("SUPABASE_URL", "")
    return bool(url) and "your_" not in url


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(str(_DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def _init_db():
    with _get_conn() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS books (
                id          TEXT PRIMARY KEY,
                title       TEXT NOT NULL,
                author      TEXT DEFAULT '',
                publisher   TEXT DEFAULT '',
                thumbnail   TEXT DEFAULT '',
                description TEXT DEFAULT '',
                category    TEXT DEFAULT '',
                isbn        TEXT DEFAULT '',
                summary     TEXT DEFAULT '',
                created_at  TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS action_items (
                id         TEXT PRIMARY KEY,
                book_id    TEXT NOT NULL,
                point      TEXT NOT NULL,
                action     TEXT NOT NULL,
                example    TEXT NOT NULL,
                page       TEXT DEFAULT '',
                category   TEXT DEFAULT '자기계발',
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS user_logs (
                id             TEXT PRIMARY KEY,
                action_item_id TEXT NOT NULL,
                device_id      TEXT NOT NULL,
                status         TEXT NOT NULL DEFAULT 'pending',
                note           TEXT DEFAULT '',
                created_at     TEXT NOT NULL,
                UNIQUE(action_item_id, device_id)
            );
        """)
        # Migration for existing databases without summary column
        try:
            conn.execute("ALTER TABLE books ADD COLUMN summary TEXT DEFAULT ''")
        except Exception:
            pass


_init_db()


def _row(r) -> dict:
    return dict(r) if r else None


# ── Supabase 클라이언트 ───────────────────────────────────────────────────
def _get_client():
    from supabase import create_client
    return create_client(os.getenv("SUPABASE_URL", ""), os.getenv("SUPABASE_KEY", ""))


# ── Books ────────────────────────────────────────────────────────────────
async def upsert_book(
    title: str, author: str = "", publisher: str = "",
    thumbnail: str = "", description: str = "",
    category: str = "", isbn: str = "", summary: str = "",
) -> dict:
    if _is_supabase():
        db = _get_client()
        # isbn 또는 title로 기존 책 조회
        existing = None
        if isbn:
            r = db.table("books").select("*").eq("isbn", isbn).limit(1).execute()
            existing = r.data[0] if r.data else None
        if not existing:
            r = db.table("books").select("*").eq("title", title).limit(1).execute()
            existing = r.data[0] if r.data else None
        if existing:
            if summary or category:
                db.table("books").update({
                    "category": category or existing.get("category", ""),
                    "summary": summary or existing.get("summary", ""),
                }).eq("id", existing["id"]).execute()
                existing["category"] = category or existing.get("category", "")
                existing["summary"] = summary or existing.get("summary", "")
            return existing
        data = {
            "id": str(uuid.uuid4()), "title": title, "author": author,
            "publisher": publisher, "thumbnail": thumbnail,
            "description": description, "category": category,
            "isbn": isbn, "summary": summary, "created_at": _now(),
        }
        result = db.table("books").insert(data).execute()
        return result.data[0] if result.data else data

    with _get_conn() as conn:
        # isbn 중복이면 기존 행 업데이트 후 반환
        if isbn:
            row = conn.execute("SELECT * FROM books WHERE isbn = ?", (isbn,)).fetchone()
            if row:
                if summary:
                    conn.execute(
                        "UPDATE books SET category=?, summary=? WHERE isbn=?",
                        (category or _row(row)["category"], summary, isbn),
                    )
                return _row(conn.execute("SELECT * FROM books WHERE isbn = ?", (isbn,)).fetchone())
        # title 중복 체크 (isbn 없는 경우)
        row = conn.execute("SELECT * FROM books WHERE title = ? LIMIT 1", (title,)).fetchone()
        if row:
            if summary or category:
                conn.execute(
                    "UPDATE books SET category=?, summary=? WHERE id=?",
                    (category or _row(row)["category"], summary or _row(row)["summary"], _row(row)["id"]),
                )
            return _row(conn.execute("SELECT * FROM books WHERE title = ? LIMIT 1", (title,)).fetchone())
        book_id = str(uuid.uuid4())
        conn.execute(
            "INSERT INTO books (id,title,author,publisher,thumbnail,description,category,isbn,summary,created_at) "
            "VALUES (?,?,?,?,?,?,?,?,?,?)",
            (book_id, title, author, publisher, thumbnail, description, category, isbn, summary, _now()),
        )
    return {"id": book_id, "title": title, "author": author, "publisher": publisher,
            "thumbnail": thumbnail, "description": description, "category": category,
            "isbn": isbn, "summary": summary}


async def get_books() -> list[dict]:
    if _is_supabase():
        db = _get_client()
        return db.table("books").select("*").order("created_at", desc=True).execute().data or []
    with _get_conn() as conn:
        rows = conn.execute("SELECT * FROM books ORDER BY created_at DESC").fetchall()
    return [_row(r) for r in rows]


async def get_book_by_id(book_id: str) -> dict | None:
    if _is_supabase():
        db = _get_client()
        return db.table("books").select("*").eq("id", book_id).single().execute().data
    with _get_conn() as conn:
        row = conn.execute("SELECT * FROM books WHERE id = ?", (book_id,)).fetchone()
    return _row(row)


async def get_book_by_title(title: str) -> dict | None:
    if _is_supabase():
        db = _get_client()
        result = db.table("books").select("*").eq("title", title).limit(1).execute()
        return result.data[0] if result.data else None
    with _get_conn() as conn:
        row = conn.execute("SELECT * FROM books WHERE title = ? LIMIT 1", (title,)).fetchone()
    return _row(row)


# ── Action Items ─────────────────────────────────────────────────────────
async def save_action_items(book_id: str, items: list[dict]) -> list[dict]:
    rows = [
        {
            "id": str(uuid.uuid4()), "book_id": book_id,
            "point": item.get("point", ""), "action": item.get("action", ""),
            "example": item.get("example", ""), "page": item.get("page", ""),
            "category": item.get("category", "자기계발"), "created_at": _now(),
        }
        for item in items
    ]
    if _is_supabase():
        db = _get_client()
        return db.table("action_items").insert(rows).execute().data or rows

    with _get_conn() as conn:
        conn.executemany(
            "INSERT INTO action_items (id,book_id,point,action,example,page,category,created_at) "
            "VALUES (:id,:book_id,:point,:action,:example,:page,:category,:created_at)",
            rows,
        )
    return rows


async def get_action_items_by_book(book_id: str) -> list[dict]:
    if _is_supabase():
        db = _get_client()
        rows = db.table("action_items").select("*, books(title)").eq("book_id", book_id).execute().data or []
        return rows

    with _get_conn() as conn:
        rows = conn.execute(
            "SELECT a.*, b.title AS book_title FROM action_items a "
            "JOIN books b ON a.book_id = b.id WHERE a.book_id = ?",
            (book_id,),
        ).fetchall()
    return [_row(r) for r in rows]


async def get_all_action_items(category: str | None = None) -> list[dict]:
    if _is_supabase():
        db = _get_client()
        query = db.table("action_items").select("*, books(title)")
        if category:
            query = query.eq("category", category)
        rows = query.order("created_at", desc=True).execute().data or []
        for item in rows:
            if item.get("books"):
                item["book_title"] = item["books"]["title"]
                del item["books"]
        return rows

    sql = (
        "SELECT a.*, b.title AS book_title FROM action_items a "
        "JOIN books b ON a.book_id = b.id "
        + ("WHERE a.category = ? " if category else "")
        + "ORDER BY a.created_at DESC"
    )
    with _get_conn() as conn:
        rows = conn.execute(sql, (category,) if category else ()).fetchall()
    return [_row(r) for r in rows]


async def get_action_item_by_id(item_id: str) -> dict | None:
    if _is_supabase():
        db = _get_client()
        return db.table("action_items").select("*, books(title)").eq("id", item_id).single().execute().data

    with _get_conn() as conn:
        row = conn.execute(
            "SELECT a.*, b.title AS book_title FROM action_items a "
            "JOIN books b ON a.book_id = b.id WHERE a.id = ?",
            (item_id,),
        ).fetchone()
    return _row(row)


# ── User Logs ────────────────────────────────────────────────────────────
async def upsert_user_log(
    action_item_id: str, status: str, note: str = "", device_id: str = "anonymous"
) -> dict:
    if _is_supabase():
        db = _get_client()
        data = {
            "id": str(uuid.uuid4()), "action_item_id": action_item_id,
            "device_id": device_id, "status": status,
            "note": note, "created_at": _now(),
        }
        result = db.table("user_logs").upsert(data, on_conflict="action_item_id,device_id").execute()
        return result.data[0] if result.data else data

    with _get_conn() as conn:
        existing = conn.execute(
            "SELECT id, created_at FROM user_logs WHERE action_item_id=? AND device_id=?",
            (action_item_id, device_id),
        ).fetchone()
        if existing:
            conn.execute(
                "UPDATE user_logs SET status=?, note=? WHERE action_item_id=? AND device_id=?",
                (status, note, action_item_id, device_id),
            )
            log_id, created_at = existing["id"], existing["created_at"]
        else:
            log_id = str(uuid.uuid4())
            created_at = _now()
            conn.execute(
                "INSERT INTO user_logs (id,action_item_id,device_id,status,note,created_at) "
                "VALUES (?,?,?,?,?,?)",
                (log_id, action_item_id, device_id, status, note, created_at),
            )
    return {"id": log_id, "action_item_id": action_item_id, "device_id": device_id,
            "status": status, "note": note, "created_at": created_at}


async def delete_user_log(action_item_id: str, device_id: str = "anonymous") -> None:
    if _is_supabase():
        _get_client().table("user_logs").delete().eq("action_item_id", action_item_id).eq("device_id", device_id).execute()
        return
    with _get_conn() as conn:
        conn.execute(
            "DELETE FROM user_logs WHERE action_item_id=? AND device_id=?",
            (action_item_id, device_id),
        )


async def get_user_logs(
    action_item_id: str | None = None, device_id: str = "anonymous"
) -> list[dict]:
    if _is_supabase():
        db = _get_client()
        query = db.table("user_logs").select("*").eq("device_id", device_id)
        if action_item_id:
            query = query.eq("action_item_id", action_item_id)
        return query.order("created_at", desc=True).execute().data or []

    sql = (
        "SELECT * FROM user_logs WHERE device_id=? "
        + ("AND action_item_id=? " if action_item_id else "")
        + "ORDER BY created_at DESC"
    )
    params = (device_id, action_item_id) if action_item_id else (device_id,)
    with _get_conn() as conn:
        rows = conn.execute(sql, params).fetchall()
    return [_row(r) for r in rows]
