import os
import uuid
from datetime import datetime, timezone


def _is_mock() -> bool:
    url = os.getenv("SUPABASE_URL", "")
    return not url or "your_" in url


# ── 인메모리 스토리지 (Supabase 미설정 시 사용) ──────────────────────────
_mem: dict = {"books": {}, "action_items": {}, "user_logs": {}}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ── Supabase 클라이언트 (설정된 경우만) ──────────────────────────────────
def _get_client():
    from supabase import create_client
    url = os.getenv("SUPABASE_URL", "")
    key = os.getenv("SUPABASE_KEY", "")
    return create_client(url, key)


# ── Books ────────────────────────────────────────────────────────────────
async def upsert_book(
    title: str,
    author: str,
    publisher: str = "",
    thumbnail: str = "",
    description: str = "",
    category: str = "",
    isbn: str = "",
) -> dict:
    book_id = str(uuid.uuid4())
    data = {
        "id": book_id, "title": title, "author": author,
        "publisher": publisher, "thumbnail": thumbnail,
        "description": description, "category": category,
        "isbn": isbn, "created_at": _now(),
    }
    if _is_mock():
        # isbn이 같으면 기존 것 재사용
        for b in _mem["books"].values():
            if isbn and b.get("isbn") == isbn:
                return b
        _mem["books"][book_id] = data
        return data
    db = _get_client()
    result = db.table("books").upsert(data, on_conflict="isbn").execute()
    return result.data[0] if result.data else data


async def get_books() -> list[dict]:
    if _is_mock():
        return sorted(_mem["books"].values(), key=lambda x: x["created_at"], reverse=True)
    db = _get_client()
    result = db.table("books").select("*").order("created_at", desc=True).execute()
    return result.data or []


async def get_book_by_id(book_id: str) -> dict | None:
    if _is_mock():
        return _mem["books"].get(book_id)
    db = _get_client()
    result = db.table("books").select("*").eq("id", book_id).single().execute()
    return result.data


# ── Action Items ─────────────────────────────────────────────────────────
async def save_action_items(book_id: str, items: list[dict]) -> list[dict]:
    rows = []
    for item in items:
        rows.append({
            "id": str(uuid.uuid4()),
            "book_id": book_id,
            "point": item.get("point", ""),
            "action": item.get("action", ""),
            "example": item.get("example", ""),
            "page": item.get("page", ""),
            "category": item.get("category", "자기계발"),
            "created_at": _now(),
        })
    if _is_mock():
        for row in rows:
            _mem["action_items"][row["id"]] = row
        return rows
    db = _get_client()
    result = db.table("action_items").insert(rows).execute()
    return result.data or rows


async def get_action_items_by_book(book_id: str) -> list[dict]:
    if _is_mock():
        items = [i for i in _mem["action_items"].values() if i["book_id"] == book_id]
        book = _mem["books"].get(book_id, {})
        for i in items:
            i["book_title"] = book.get("title", "")
        return items
    db = _get_client()
    result = (
        db.table("action_items")
        .select("*, books(title)")
        .eq("book_id", book_id)
        .execute()
    )
    return result.data or []


async def get_all_action_items(category: str | None = None) -> list[dict]:
    if _is_mock():
        items = list(_mem["action_items"].values())
        if category:
            items = [i for i in items if i.get("category") == category]
        for i in items:
            book = _mem["books"].get(i["book_id"], {})
            i["book_title"] = book.get("title", "")
        return sorted(items, key=lambda x: x["created_at"], reverse=True)
    db = _get_client()
    query = db.table("action_items").select("*, books(title)")
    if category:
        query = query.eq("category", category)
    result = query.order("created_at", desc=True).execute()
    return result.data or []


async def get_action_item_by_id(item_id: str) -> dict | None:
    if _is_mock():
        item = _mem["action_items"].get(item_id)
        if item:
            book = _mem["books"].get(item["book_id"], {})
            item["book_title"] = book.get("title", "")
        return item
    db = _get_client()
    result = (
        db.table("action_items")
        .select("*, books(title)")
        .eq("id", item_id)
        .single()
        .execute()
    )
    return result.data


# ── User Logs ────────────────────────────────────────────────────────────
async def upsert_user_log(
    action_item_id: str, status: str, note: str = "", device_id: str = "anonymous"
) -> dict:
    if _is_mock():
        for log in _mem["user_logs"].values():
            if log["action_item_id"] == action_item_id and log.get("device_id") == device_id:
                log.update({"status": status, "note": note})
                return log
        log_id = str(uuid.uuid4())
        data = {
            "id": log_id, "action_item_id": action_item_id,
            "device_id": device_id, "status": status,
            "note": note, "created_at": _now(),
        }
        _mem["user_logs"][log_id] = data
        return data
    db = _get_client()
    log_id = str(uuid.uuid4())
    data = {
        "id": log_id, "action_item_id": action_item_id,
        "device_id": device_id, "status": status,
        "note": note, "created_at": _now(),
    }
    result = db.table("user_logs").upsert(
        data, on_conflict="action_item_id,device_id"
    ).execute()
    return result.data[0] if result.data else data


async def delete_user_log(action_item_id: str, device_id: str = "anonymous") -> None:
    if _is_mock():
        to_del = [
            k for k, v in _mem["user_logs"].items()
            if v["action_item_id"] == action_item_id and v.get("device_id") == device_id
        ]
        for k in to_del:
            del _mem["user_logs"][k]
        return
    db = _get_client()
    db.table("user_logs").delete().eq("action_item_id", action_item_id).eq("device_id", device_id).execute()


async def get_user_logs(
    action_item_id: str | None = None, device_id: str = "anonymous"
) -> list[dict]:
    if _is_mock():
        logs = [v for v in _mem["user_logs"].values() if v.get("device_id") == device_id]
        if action_item_id:
            logs = [l for l in logs if l["action_item_id"] == action_item_id]
        return sorted(logs, key=lambda x: x["created_at"], reverse=True)
    db = _get_client()
    query = db.table("user_logs").select("*").eq("device_id", device_id)
    if action_item_id:
        query = query.eq("action_item_id", action_item_id)
    result = query.order("created_at", desc=True).execute()
    return result.data or []
