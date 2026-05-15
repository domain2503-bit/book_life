from fastapi import APIRouter, HTTPException, Query, Request
from models.schemas import UserLogRequest
from services import supabase_service

router = APIRouter(prefix="/logs", tags=["logs"])


def _device_id(request: Request) -> str:
    return request.headers.get("X-Device-ID", "anonymous")


@router.post("/")
async def upsert_log(req: UserLogRequest, request: Request):
    """실천 기록 저장 (체크/메모)"""
    try:
        log = await supabase_service.upsert_user_log(
            action_item_id=req.action_item_id,
            status=req.status.value,
            note=req.note or "",
            device_id=_device_id(request),
        )
        return {"log": log}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/")
async def get_logs(request: Request, action_item_id: str | None = Query(None)):
    """실천 기록 조회 (해당 디바이스 기록만)"""
    try:
        logs = await supabase_service.get_user_logs(
            action_item_id=action_item_id,
            device_id=_device_id(request),
        )
        return {"logs": logs, "total": len(logs)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{action_item_id}")
async def delete_log(action_item_id: str, request: Request):
    """실천 기록 삭제 (My Life에서 제거)"""
    try:
        await supabase_service.delete_user_log(
            action_item_id=action_item_id,
            device_id=_device_id(request),
        )
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
