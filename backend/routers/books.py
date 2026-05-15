from fastapi import APIRouter, HTTPException, Query
from models.schemas import BookSearchRequest, KeywordRecommendRequest
from services import naver_service, supabase_service

router = APIRouter(prefix="/books", tags=["books"])


@router.post("/search")
async def search_books(req: BookSearchRequest):
    """네이버 도서 검색 API로 책 정보 조회"""
    try:
        books = await naver_service.search_books(req.title, req.author)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    if not books:
        raise HTTPException(status_code=404, detail="검색 결과가 없습니다.")
    return {"books": books}


@router.post("/recommend")
async def recommend_books(req: KeywordRecommendRequest):
    """관심 키워드 기반 도서 추천"""
    try:
        books = await naver_service.recommend_books_by_keyword(req.keyword)
        return {"books": books}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/")
async def list_saved_books():
    """저장된 도서 목록 조회"""
    try:
        books = await supabase_service.get_books()
        return {"books": books}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
