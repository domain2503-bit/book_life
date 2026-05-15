"""
시뮬레이션 모드 테스트 - Supabase 키 없이도 mock 로직 자체를 검증
"""
import asyncio
import os
import sys

# 환경변수를 mock 상태로 강제 설정
os.environ["NAVER_CLIENT_ID"] = ""
os.environ["NAVER_CLIENT_SECRET"] = ""
os.environ["GEMINI_API_KEY"] = ""
os.environ["SUPABASE_URL"] = ""
os.environ["SUPABASE_KEY"] = ""

sys.path.insert(0, os.path.dirname(__file__))

from services.naver_service import (
    _is_mock as naver_is_mock,
    _search_mock_books,
    _mock_reviews,
    _recommend_mock_books,
    search_books,
    search_book_reviews,
    recommend_books_by_keyword,
)
from services.ai_service import (
    _is_mock as ai_is_mock,
    _mock_action_items,
    _mock_category,
    generate_action_items,
    classify_books_category,
)


PASS = "✅"
FAIL = "❌"


def check(label: str, condition: bool):
    icon = PASS if condition else FAIL
    print(f"  {icon} {label}")
    if not condition:
        raise AssertionError(f"FAILED: {label}")


async def test_naver_mock():
    print("\n[1] Naver Service - 시뮬레이션 모드")
    check("_is_mock() == True (키 없음)", naver_is_mock())

    books = await search_books("원씽")
    check("search_books: 결과 반환", len(books) > 0)
    check("search_books: 실제 책 제목 반환", any("원씽" in b["title"] for b in books))
    check("search_books: 필수 필드 존재", all(k in books[0] for k in ["title", "author", "publisher", "thumbnail", "description", "isbn"]))

    reviews = await search_book_reviews("원씽")
    check("search_book_reviews: 5개 이상 반환", len(reviews) >= 5)
    check("search_book_reviews: 텍스트 내용 존재", len(reviews[0]) > 10)

    recs = await recommend_books_by_keyword("투자")
    check("recommend_books: 10권 반환", len(recs) == 10)
    check("recommend_books: 실제 투자 도서 포함", any("투자" in b["title"] or "주식" in b["title"] or "돈" in b["title"] for b in recs))


async def test_ai_mock():
    print("\n[2] AI Service - 시뮬레이션 모드")
    check("_is_mock() == True (키 없음)", ai_is_mock())

    items = await generate_action_items("원씽", "게리 켈러", [])
    check("generate_action_items: 15개 이상 반환", len(items) >= 15)
    check("generate_action_items: 필수 필드 존재", all(
        all(k in item for k in ["point", "action", "example", "page", "category"])
        for item in items
    ))
    valid_cats = {"투자", "육아", "자기계발", "업무", "건강"}
    check("generate_action_items: 유효한 카테고리", all(item["category"] in valid_cats for item in items))

    cats_in_items = {item["category"] for item in items}
    check("generate_action_items: 다양한 카테고리 (3개 이상)", len(cats_in_items) >= 3)

    books = [{"isbn": "111", "title": "테스트 책", "description": "설명"}]
    cats = await classify_books_category("자기계발", books)
    check("classify_books_category: 결과 반환", len(cats) > 0)
    check("classify_books_category: isbn 포함", "isbn" in cats[0])
    check("classify_books_category: category 포함", cats[0]["category"] in valid_cats)


def test_schema():
    print("\n[3] 데이터 스키마 검증")
    # 실제 책 검색 DB
    from services.naver_service import BOOK_DB
    cats = {b["category"] for b in BOOK_DB}
    check("BOOK_DB: 5개 카테고리 전부 존재", cats == {"투자", "육아", "자기계발", "업무", "건강"})
    투자_books = _recommend_mock_books("투자")
    check("투자 카테고리 10권", len(투자_books) == 10)
    check("자동완성: '습관' 검색 결과 존재", len(_search_mock_books("습관")) > 0)
    check("자동완성: 결과에 author 필드 존재", all("author" in b for b in _search_mock_books("원")))

    items = _mock_action_items("테스트 책")
    for i, item in enumerate(items):
        for field in ["point", "action", "example", "page", "category"]:
            assert field in item and item[field], f"item[{i}] missing or empty: {field}"
    check(f"액션 아이템 {len(items)}개 스키마 정상", True)

    books = [{"isbn": f"isbn_{i}", "title": f"책_{i}"} for i in range(5)]
    cats = _mock_category(books)
    check("카테고리 분류 수 일치", len(cats) == len(books))


async def main():
    print("=" * 50)
    print("Action Log - 시뮬레이션 모드 테스트")
    print("=" * 50)
    try:
        await test_naver_mock()
        await test_ai_mock()
        test_schema()
        print("\n" + "=" * 50)
        print(f"{PASS} 모든 테스트 통과! Supabase 키만 있으면 앱이 작동합니다.")
        print("=" * 50)
    except AssertionError as e:
        print(f"\n{FAIL} {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
