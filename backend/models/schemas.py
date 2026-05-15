from pydantic import BaseModel
from typing import Optional
from enum import Enum


class Category(str, Enum):
    investment = "투자"
    parenting = "육아"
    self_development = "자기계발"
    work = "업무"
    health = "건강"


class ActionStatus(str, Enum):
    pending = "pending"
    done = "done"


# Request models
class BookSearchRequest(BaseModel):
    title: str
    author: Optional[str] = None


class KeywordRecommendRequest(BaseModel):
    keyword: str


class ActionItemSaveRequest(BaseModel):
    book_id: str
    action_item_ids: list[str]


class UserLogRequest(BaseModel):
    action_item_id: str
    status: ActionStatus
    note: Optional[str] = None


# Response models
class BookResponse(BaseModel):
    id: str
    title: str
    author: str
    publisher: Optional[str] = None
    thumbnail: Optional[str] = None
    description: Optional[str] = None
    category: Optional[Category] = None


class ActionItemResponse(BaseModel):
    id: str
    book_id: str
    book_title: Optional[str] = None
    point: str
    action: str
    example: str
    page: str
    category: Category


class UserLogResponse(BaseModel):
    id: str
    action_item_id: str
    status: ActionStatus
    note: Optional[str] = None
    created_at: str


class GenerateActionsRequest(BaseModel):
    book_title: str
    author: str
    reviews: list[str] = []
    book_category: Optional[str] = None  # 없으면 AI가 자동 판별
