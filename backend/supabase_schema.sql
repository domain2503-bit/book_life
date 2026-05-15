-- Books 테이블
CREATE TABLE IF NOT EXISTS books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    publisher TEXT DEFAULT '',
    thumbnail TEXT DEFAULT '',
    description TEXT DEFAULT '',
    category TEXT DEFAULT '',
    isbn TEXT UNIQUE DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Action Items 테이블
CREATE TABLE IF NOT EXISTS action_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    point TEXT NOT NULL,
    action TEXT NOT NULL,
    example TEXT DEFAULT '',
    page TEXT DEFAULT '',
    category TEXT NOT NULL CHECK (category IN ('투자', '육아', '자기계발', '업무', '건강')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Logs 테이블 (device_id로 사용자 식별)
CREATE TABLE IF NOT EXISTS user_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_item_id UUID NOT NULL REFERENCES action_items(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL CHECK (status IN ('pending', 'done')) DEFAULT 'pending',
    note TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (action_item_id, device_id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_action_items_book_id ON action_items(book_id);
CREATE INDEX IF NOT EXISTS idx_action_items_category ON action_items(category);
CREATE INDEX IF NOT EXISTS idx_user_logs_action_item_id ON user_logs(action_item_id);
CREATE INDEX IF NOT EXISTS idx_user_logs_device_id ON user_logs(device_id);

-- 기존 스키마에 device_id 컬럼 추가하는 마이그레이션 (이미 테이블이 있는 경우)
-- ALTER TABLE user_logs ADD COLUMN IF NOT EXISTS device_id TEXT NOT NULL DEFAULT '';
-- ALTER TABLE user_logs DROP CONSTRAINT IF EXISTS user_logs_action_item_id_key;
-- ALTER TABLE user_logs ADD CONSTRAINT user_logs_action_item_device_key UNIQUE (action_item_id, device_id);
