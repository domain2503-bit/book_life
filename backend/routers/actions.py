import asyncio
from fastapi import APIRouter, HTTPException, Query
from models.schemas import GenerateActionsRequest
from services import naver_service, ai_service, supabase_service

router = APIRouter(prefix="/actions", tags=["actions"])


@router.post("/generate")
async def generate_actions(req: GenerateActionsRequest):
    """도서 서평 기반 AI 액션 아이템 15개 이상 생성 + DB 저장"""
    try:
        # 0. 캐시 확인: DB에 이미 있으면 Gemini 호출 없이 즉시 반환
        existing_book = await supabase_service.get_book_by_title(req.book_title)
        if existing_book:
            cached_items = await supabase_service.get_action_items_by_book(existing_book["id"])
            if len(cached_items) >= 10:
                for item in cached_items:
                    if item.get("books"):
                        item["book_title"] = item["books"]["title"]
                        del item["books"]
                return {
                    "book_id": existing_book["id"],
                    "book_title": req.book_title,
                    "book_category": existing_book.get("category", "자기계발"),
                    "book_summary": existing_book.get("summary", ""),
                    "review_sources": [],
                    "total": len(cached_items),
                    "action_items": cached_items,
                }

        # 1. 서평 수집 (URL 포함)
        review_sources: list[str] = []
        if req.reviews:
            review_texts = req.reviews
        else:
            reviews_data = await naver_service.search_book_reviews(req.book_title, req.author)
            review_texts = [r["text"] for r in reviews_data]
            review_sources = [
                {"title": r.get("title", ""), "url": r["url"]}
                for r in reviews_data if r.get("url")
            ][:5]

        # 2. 카테고리 확정 (전달값 → BOOK_DB → 키워드 → AI 순)
        book_category = req.book_category or None

        # 3. 책 요약 + 액션 아이템 동시 생성
        summary, items = await _generate_summary_and_items(
            req.book_title, req.author, review_texts, book_category
        )

        final_category = items[0]["category"] if items else "자기계발"

        # 4. DB 저장
        book = await supabase_service.upsert_book(
            title=req.book_title,
            author=req.author,
            category=final_category,
            summary=summary,
        )
        book_id = book["id"]
        saved = await supabase_service.save_action_items(book_id, items)

        return {
            "book_id": book_id,
            "book_title": req.book_title,
            "book_category": final_category,
            "book_summary": summary,
            "review_sources": review_sources,
            "total": len(saved),
            "action_items": saved,
        }
    except HTTPException:
        raise
    except Exception as e:
        err = str(e)
        if "429" in err or "RESOURCE_EXHAUSTED" in err:
            raise HTTPException(
                status_code=429,
                detail="AI 사용량 한도를 초과했습니다. 잠시 후 다시 시도해주세요.",
            )
        raise HTTPException(status_code=500, detail=err)


async def _generate_summary_and_items(
    book_title: str, author: str, reviews: list[str], book_category: str | None
):
    """카테고리를 먼저 확정한 뒤 요약·액션을 병렬 생성 (총 시간 단축)"""
    # 1. 카테고리 확정 (빠름: BOOK_DB 조회 → 키워드 → Gemini)
    if not book_category or book_category not in ai_service.VALID_CATEGORIES:
        book_category = await ai_service._determine_book_category(book_title, author)

    # 2. 액션 아이템 + 요약 병렬 실행
    items, summary = await asyncio.gather(
        ai_service.generate_action_items(book_title, author, reviews, book_category),
        ai_service.generate_book_summary(book_title, author, reviews, book_category),
    )
    return summary, items


@router.get("/")
async def list_action_items(
    category: str | None = Query(None, description="카테고리 필터: 경제경영|자기계발|인문|유아|건강|산업트렌드"),
):
    """저장된 액션 아이템 목록 (카테고리 필터 가능)"""
    try:
        items = await supabase_service.get_all_action_items(category)
        for item in items:
            if item.get("books"):
                item["book_title"] = item["books"]["title"]
                del item["books"]
        return {"action_items": items, "total": len(items)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{book_id}")
async def get_actions_by_book(book_id: str):
    """특정 도서의 액션 아이템 조회"""
    try:
        items = await supabase_service.get_action_items_by_book(book_id)
        for item in items:
            if item.get("books"):
                item["book_title"] = item["books"]["title"]
                del item["books"]
        return {"action_items": items, "total": len(items)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
