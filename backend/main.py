from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from routers import books, actions, logs

app = FastAPI(
    title="Action Log API",
    description="독서 실천 액션 플래너 - 도서 인사이트를 실천 액션으로 변환",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(books.router)
app.include_router(actions.router)
app.include_router(logs.router)


@app.get("/")
async def root():
    return {"message": "Action Log API is running", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "ok"}
