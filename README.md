# Action Log - 독서 실천 액션 플래너

## 프로젝트 구조
```
book_life/
├── backend/         # Python FastAPI 서버
└── frontend/        # React Native (Expo) 앱
```

## 빠른 시작

### 1. 백엔드 설정
```bash
cd backend

# 가상환경 생성 및 패키지 설치
python -m venv venv
source venv/bin/activate      # macOS/Linux
pip install -r requirements.txt

# 환경변수 설정
cp .env.example .env
# .env 파일에 아래 4개 키를 입력:
#   ANTHROPIC_API_KEY
#   NAVER_CLIENT_ID / NAVER_CLIENT_SECRET
#   SUPABASE_URL / SUPABASE_KEY

# 서버 실행
uvicorn main:app --reload --port 8000
```

### 2. Supabase DB 설정
Supabase 프로젝트 → SQL Editor에서 `supabase_schema.sql` 실행

### 3. 프론트엔드 설정
```bash
cd frontend
npm install
npx expo start
```

## API 엔드포인트
| Method | Path | 설명 |
|--------|------|------|
| POST | /books/search | 책 검색 (네이버 API) |
| POST | /books/recommend | 키워드 기반 도서 추천 |
| GET | /books/ | 저장된 도서 목록 |
| POST | /actions/generate | AI 액션 아이템 생성 (15개+) |
| GET | /actions/ | 전체 액션 아이템 조회 (카테고리 필터) |
| GET | /actions/{book_id} | 특정 도서 액션 아이템 |
| POST | /logs/ | 실천 기록 저장 |
| GET | /logs/ | 실천 기록 조회 |

## 환경변수 획득 방법
- **Anthropic API Key**: https://console.anthropic.com
- **Naver API**: https://developers.naver.com → 검색 API 등록
- **Supabase**: https://supabase.com → 새 프로젝트 생성
