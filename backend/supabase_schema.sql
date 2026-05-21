-- Books 테이블
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

-- Action Items 테이블
CREATE TABLE IF NOT EXISTS action_items (
    id         TEXT PRIMARY KEY,
    book_id    TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    point      TEXT NOT NULL,
    action     TEXT NOT NULL,
    example    TEXT DEFAULT '',
    page       TEXT DEFAULT '',
    category   TEXT DEFAULT '자기계발',
    created_at TEXT NOT NULL
);

-- User Logs 테이블
CREATE TABLE IF NOT EXISTS user_logs (
    id             TEXT PRIMARY KEY,
    action_item_id TEXT NOT NULL REFERENCES action_items(id) ON DELETE CASCADE,
    device_id      TEXT NOT NULL DEFAULT '',
    status         TEXT NOT NULL DEFAULT 'pending',
    note           TEXT DEFAULT '',
    created_at     TEXT NOT NULL,
    UNIQUE (action_item_id, device_id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_action_items_book_id  ON action_items(book_id);
CREATE INDEX IF NOT EXISTS idx_action_items_category ON action_items(category);
CREATE INDEX IF NOT EXISTS idx_user_logs_action_item ON user_logs(action_item_id);
CREATE INDEX IF NOT EXISTS idx_user_logs_device      ON user_logs(device_id);
