import anthropic
import json
import os
import re


_client = None


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))
    return _client


SYSTEM_PROMPT = """당신은 독서 인사이트 추출 전문가입니다.
수집된 서평 데이터와 도서 메타데이터를 분석하여 독자가 실생활에서 즉시 실천할 수 있는 액션 아이템을 추출합니다.
반드시 JSON 배열만 반환하세요. 다른 텍스트는 포함하지 마세요."""

ACTION_PROMPT_TEMPLATE = """다음 도서의 서평 데이터를 분석하여 최소 15개의 실천 액션 아이템을 JSON 배열로 추출하라.

도서 정보:
- 제목: {title}
- 저자: {author}

서평 데이터:
{reviews}

각 액션 아이템은 다음 JSON 형식으로 반환하라:
[
  {{
    "point": "핵심 인사이트 (책의 핵심 메시지를 1-2문장으로)",
    "action": "당장 실행 가능한 구체적 행동 지침 (오늘부터 할 수 있는 것)",
    "example": "책 속의 실제 비유나 저자가 제시한 사례",
    "page": "관련 챕터 및 페이지 정보 (예: p.45, 3장)",
    "category": "투자 | 육아 | 자기계발 | 업무 | 건강 중 하나"
  }}
]

규칙:
- 반드시 15개 이상 추출
- category는 반드시 [투자, 육아, 자기계발, 업무, 건강] 중 하나
- action은 구체적이고 즉시 실행 가능해야 함
- JSON 배열만 반환, 다른 텍스트 없음"""

RECOMMEND_SYSTEM_PROMPT = """당신은 독서 추천 전문가입니다.
사용자의 관심 키워드와 도서 목록을 분석하여 각 도서의 카테고리를 분류합니다.
반드시 JSON만 반환하세요."""

RECOMMEND_PROMPT_TEMPLATE = """다음 키워드에 맞는 도서 목록의 카테고리를 분류하라.

키워드: {keyword}

도서 목록:
{books}

각 도서에 대해 다음 JSON 형식으로 반환하라:
[
  {{
    "isbn": "isbn",
    "category": "투자 | 육아 | 자기계발 | 업무 | 건강 중 하나"
  }}
]

JSON 배열만 반환, 다른 텍스트 없음."""


async def generate_action_items(
    book_title: str, author: str, reviews: list[str]
) -> list[dict]:
    reviews_text = "\n\n".join(reviews) if reviews else "서평 데이터가 없습니다."

    prompt = ACTION_PROMPT_TEMPLATE.format(
        title=book_title,
        author=author,
        reviews=reviews_text[:8000],
    )

    client = _get_client()
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = message.content[0].text.strip()
    json_str = _extract_json(raw)
    items = json.loads(json_str)

    valid_categories = {"투자", "육아", "자기계발", "업무", "건강"}
    for item in items:
        if item.get("category") not in valid_categories:
            item["category"] = "자기계발"

    return items


async def classify_books_category(keyword: str, books: list[dict]) -> list[dict]:
    books_text = "\n".join(
        [f"- ISBN: {b.get('isbn', '')}, 제목: {b['title']}, 설명: {b.get('description', '')[:100]}" for b in books]
    )

    prompt = RECOMMEND_PROMPT_TEMPLATE.format(keyword=keyword, books=books_text)

    client = _get_client()
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=RECOMMEND_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = message.content[0].text.strip()
    json_str = _extract_json(raw)
    return json.loads(json_str)


def _extract_json(text: str) -> str:
    match = re.search(r"\[.*\]", text, re.DOTALL)
    if match:
        return match.group(0)
    return text
