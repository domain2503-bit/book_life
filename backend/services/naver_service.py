import httpx
import os
from typing import Optional


NAVER_CLIENT_ID = os.getenv("NAVER_CLIENT_ID", "")
NAVER_CLIENT_SECRET = os.getenv("NAVER_CLIENT_SECRET", "")
NAVER_BOOK_URL = "https://openapi.naver.com/v1/search/book.json"
NAVER_BLOG_URL = "https://openapi.naver.com/v1/search/blog.json"


def _is_mock() -> bool:
    return not NAVER_CLIENT_ID or "your_" in NAVER_CLIENT_ID


def _naver_headers() -> dict:
    return {
        "X-Naver-Client-Id": NAVER_CLIENT_ID,
        "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
    }


# Naver book description/title 텍스트로 앱 5개 카테고리 중 하나 추론
def _classify_from_text(title: str, description: str = "") -> str | None:
    text = (title + " " + description).lower()
    if any(w in text for w in ["투자", "주식", "재테크", "펀드", "채권", "금융투자", "부동산투자"]):
        return "투자"
    if any(w in text for w in ["육아", "유아", "자녀", "어린이", "임신", "출산", "태교", "아이"]):
        return "육아"
    if any(w in text for w in ["건강", "운동법", "다이어트", "의학", "면역", "수면장애", "영양", "헬스"]):
        return "건강"
    if any(w in text for w in ["경영", "리더십", "직장인", "스타트업", "마케팅", "창업", "비즈니스"]):
        return "업무"
    if any(w in text for w in ["자기계발", "습관", "동기부여", "목표달성", "성공법칙", "자기관리"]):
        return "자기계발"
    return None


# 실제 존재하는 베스트셀러 DB (시뮬레이션용)
BOOK_DB = [
    # 자기계발
    {"title": "아주 작은 습관의 힘", "author": "제임스 클리어", "publisher": "비즈니스북스", "description": "매일 1%씩 나아지는 습관의 복리 효과를 과학적으로 분석. 작은 변화가 놀라운 결과를 만드는 원리.", "isbn": "9791162540640", "category": "자기계발"},
    {"title": "원씽", "author": "게리 켈러", "publisher": "비즈니스북스", "description": "한 가지 중요한 것에 집중할 때 비범한 결과가 따라온다. 성공한 사람들의 공통 원칙.", "isbn": "9788997497461", "category": "자기계발"},
    {"title": "미라클 모닝", "author": "할 엘로드", "publisher": "한빛비즈", "description": "아침 1시간이 인생을 바꾼다. 성공한 사람들의 아침 루틴 6가지 습관.", "isbn": "9791185831022", "category": "자기계발"},
    {"title": "딥 워크", "author": "칼 뉴포트", "publisher": "민음인", "description": "집중력이 새로운 IQ다. 방해 없이 몰입하는 능력이 21세기 핵심 경쟁력.", "isbn": "9788937461071", "category": "자기계발"},
    {"title": "그릿", "author": "앤절라 더크워스", "publisher": "비즈니스북스", "description": "재능보다 열정과 끈기가 성공을 결정한다. 세계 최고들의 공통점.", "isbn": "9791162540244", "category": "자기계발"},
    {"title": "아웃라이어", "author": "말콤 글래드웰", "publisher": "김영사", "description": "1만 시간의 법칙. 성공한 사람들의 숨겨진 기회와 맥락을 파헤친다.", "isbn": "9788934936756", "category": "자기계발"},
    {"title": "생각에 관한 생각", "author": "대니얼 카너먼", "publisher": "김영사", "description": "노벨 경제학상 수상자가 밝히는 인간 판단의 두 가지 시스템.", "isbn": "9788934968771", "category": "자기계발"},
    {"title": "마인드셋", "author": "캐럴 드웩", "publisher": "스몰빅라이프", "description": "성장 마인드셋 vs 고정 마인드셋. 어떤 마음가짐이 인생을 바꾸는가.", "isbn": "9791188556120", "category": "자기계발"},
    {"title": "부의 인문학", "author": "브라운스톤", "publisher": "오픈마인드", "description": "인문학적 통찰로 읽는 부와 성공의 본질. 역사 속 부자들의 공통 원칙.", "isbn": "9791188285891", "category": "자기계발"},
    {"title": "완벽한 공부법", "author": "고영성, 신영준", "publisher": "로크미디어", "description": "뇌과학과 심리학이 증명한 최고의 공부 전략. 공부 잘하는 법의 과학적 근거.", "isbn": "9788925564500", "category": "자기계발"},
    {"title": "나는 4시간만 일한다", "author": "팀 페리스", "publisher": "다산북스", "description": "주 4시간 근무로 이상적인 삶을 설계하는 라이프스타일 디자인.", "isbn": "9788963700700", "category": "자기계발"},
    {"title": "에센셜리즘", "author": "그레그 맥커운", "publisher": "알에이치코리아", "description": "더 적게, 그러나 더 잘하라. 본질에 집중하는 삶의 기술.", "isbn": "9788925549750", "category": "자기계발"},
    {"title": "몰입의 즐거움", "author": "미하이 칙센트미하이", "publisher": "해냄", "description": "최적 경험의 심리학. 진정한 행복은 몰입에서 온다.", "isbn": "9788973372553", "category": "자기계발"},
    {"title": "타이탄의 도구들", "author": "팀 페리스", "publisher": "토네이도", "description": "세계 최고들의 습관, 루틴, 도구를 200명 인터뷰로 정리했다.", "isbn": "9791187807254", "category": "자기계발"},
    {"title": "당신의 뇌는 최적화를 원한다", "author": "가바사와 시온", "publisher": "쌤앤파커스", "description": "정신과 의사가 알려주는 뇌를 100% 활용하는 최강의 집중법.", "isbn": "9791165341138", "category": "자기계발"},
    # 투자
    {"title": "현명한 투자자", "author": "벤저민 그레이엄", "publisher": "국일증권경제연구소", "description": "가치투자의 바이블. 워런 버핏이 '내 인생 최고의 책'이라 극찬한 투자 고전.", "isbn": "9788976544100", "category": "투자"},
    {"title": "돈의 심리학", "author": "모건 하우절", "publisher": "인플루엔셜", "description": "19개의 짧은 이야기로 읽는 부와 탐욕과 행복에 관한 심리학.", "isbn": "9791191056242", "category": "투자"},
    {"title": "돈의 속성", "author": "김승호", "publisher": "스노우폭스북스", "description": "돈을 다루는 법, 돈을 버는 법, 돈이 오게 하는 법. 스노우폭스 창업자의 돈 철학.", "isbn": "9791190100397", "category": "투자"},
    {"title": "부자 아빠 가난한 아빠", "author": "로버트 기요사키", "publisher": "민음인", "description": "학교에서 가르쳐주지 않는 돈과 투자의 진실. 부자들의 사고방식.", "isbn": "9788937460388", "category": "투자"},
    {"title": "부의 추월차선", "author": "MJ 드마코", "publisher": "토트출판사", "description": "평생 검약하며 기다리지 말고, 지금 당장 부를 만드는 추월차선 전략.", "isbn": "9788992920902", "category": "투자"},
    {"title": "나는 주식 대신 달러를 산다", "author": "박성현", "publisher": "알에이치코리아", "description": "환율과 달러 자산으로 평생 돈 걱정 없이 사는 법.", "isbn": "9791162244319", "category": "투자"},
    {"title": "주식 투자 무작정 따라하기", "author": "윤재수", "publisher": "길벗", "description": "주식 초보자를 위한 친절한 투자 입문서. 계좌 개설부터 매도까지.", "isbn": "9791160505917", "category": "투자"},
    {"title": "피터 린치의 이기는 투자", "author": "피터 린치", "publisher": "국일증권경제연구소", "description": "월가의 전설 피터 린치가 알려주는 개인 투자자의 무기.", "isbn": "9788976544124", "category": "투자"},
    {"title": "워런 버핏 바이블", "author": "워런 버핏", "publisher": "에프엔미디어", "description": "오마하의 현인 워런 버핏의 투자 철학과 원칙을 집대성.", "isbn": "9791188754083", "category": "투자"},
    {"title": "주린이가 가장 알고 싶은 최다질문 TOP 77", "author": "염승환", "publisher": "이레미디어", "description": "주식 왕초보의 77가지 질문에 현직 애널리스트가 답하다.", "isbn": "9791163521556", "category": "투자"},
    # 건강
    {"title": "운동의 뇌과학", "author": "존 레이티", "publisher": "북섬", "description": "운동이 뇌에 미치는 혁명적 영향. 운동은 최고의 항우울제이자 집중력 향상제다.", "isbn": "9788991965379", "category": "건강"},
    {"title": "잠의 과학", "author": "매슈 워커", "publisher": "열린책들", "description": "수면 전문가가 밝히는 수면의 놀라운 힘. 잠이 부족하면 뇌와 몸이 망가진다.", "isbn": "9788932918136", "category": "건강"},
    {"title": "식사가 잘못됐습니다", "author": "마키타 젠지", "publisher": "더난출판", "description": "혈당 스파이크를 잡아라. 당질 제한으로 몸과 마음을 바꾸는 식사법.", "isbn": "9791187128625", "category": "건강"},
    {"title": "내 몸 사용설명서", "author": "마이클 로이젠, 메멧 오즈", "publisher": "김영사", "description": "우리 몸의 작동 원리를 알면 건강하게 오래 살 수 있다.", "isbn": "9788934921943", "category": "건강"},
    {"title": "아픔이 길이 되려면", "author": "김승섭", "publisher": "동아시아", "description": "사회역학자가 쓴 질병과 사회의 관계. 왜 어떤 사람들은 더 아픈가.", "isbn": "9788962623048", "category": "건강"},
    {"title": "12가지 인생의 법칙", "author": "조던 피터슨", "publisher": "메이븐", "description": "혼돈에 맞서는 해독제. 심리학자가 제안하는 의미있는 삶의 12가지 규칙.", "isbn": "9791188765393", "category": "건강"},
    {"title": "스트레스의 힘", "author": "켈리 맥고니걸", "publisher": "21세기북스", "description": "스트레스는 적이 아니다. 스트레스를 친구로 만드는 마음챙김 전략.", "isbn": "9788950970017", "category": "건강"},
    {"title": "텔로미어 효과", "author": "엘리자베스 블랙번", "publisher": "알에이치코리아", "description": "노벨상 수상 과학자가 밝히는 세포 수준에서 노화를 늦추는 방법.", "isbn": "9791162240526", "category": "건강"},
    {"title": "면역에 관하여", "author": "율라 비스", "publisher": "열린책들", "description": "백신과 면역에 관한 두려움과 신화를 명쾌하게 파헤치는 에세이.", "isbn": "9788932917634", "category": "건강"},
    {"title": "당신은 뇌를 고칠 수 있다", "author": "톰 오브라이언", "publisher": "한문화", "description": "글루텐과 장 건강이 뇌에 미치는 영향. 뇌 기능을 최적화하는 식이 전략.", "isbn": "9788956027272", "category": "건강"},
    # 업무
    {"title": "하이 아웃풋 매니지먼트", "author": "앤드루 그로브", "publisher": "청림출판", "description": "인텔 CEO가 알려주는 관리자의 일. 어떻게 팀의 성과를 극대화할 것인가.", "isbn": "9788935211500", "category": "업무"},
    {"title": "실리콘밸리의 팀장들", "author": "킴 스콧", "publisher": "청림출판", "description": "완전한 솔직함. 팀원을 성장시키고 팀을 이끄는 리더십의 기술.", "isbn": "9788935213825", "category": "업무"},
    {"title": "제로 투 원", "author": "피터 틸", "publisher": "한국경제신문", "description": "페이팔 창업자가 말하는 창업과 혁신. 0에서 1을 만드는 스타트업 철학.", "isbn": "9788947540766", "category": "업무"},
    {"title": "레버리지", "author": "롭 무어", "publisher": "다산북스", "description": "타인의 시간, 돈, 경험을 이용해 자신의 시간을 자유롭게 만드는 법.", "isbn": "9791130606316", "category": "업무"},
    {"title": "팀장의 탄생", "author": "줄리 조", "publisher": "더퀘스트", "description": "처음 팀장이 된 사람을 위한 실전 리더십 가이드.", "isbn": "9788965703242", "category": "업무"},
    {"title": "함께 자라기", "author": "김창준", "publisher": "인사이트", "description": "애자일 전문가가 말하는 함께 성장하는 팀과 조직 문화.", "isbn": "9788966262397", "category": "업무"},
    {"title": "일의 의미", "author": "배리 슈워츠", "publisher": "에이트포인트", "description": "왜 일을 사랑하기 어려운가. 좋은 일의 조건과 의미 있는 직업 생활.", "isbn": "9788994786742", "category": "업무"},
    {"title": "데드라인", "author": "톰 드마르코", "publisher": "인사이트", "description": "소설 형식으로 읽는 프로젝트 관리의 핵심. 마감과 팀워크의 진실.", "isbn": "9788966260010", "category": "업무"},
    {"title": "린 스타트업", "author": "에릭 리스", "publisher": "인사이트", "description": "빠른 실험과 고객 피드백으로 낭비 없이 사업을 키우는 방법.", "isbn": "9788966260522", "category": "업무"},
    {"title": "넛지", "author": "리처드 탈러, 캐스 선스타인", "publisher": "리더스북", "description": "노벨 경제학상 수상자의 행동경제학. 더 나은 선택을 유도하는 설계.", "isbn": "9788926408728", "category": "업무"},
    # 육아
    {"title": "아이의 사생활", "author": "EBS 제작팀", "publisher": "지식채널", "description": "EBS 다큐 원작. 아이의 뇌 발달, 기질, 사회성의 비밀을 과학적으로 밝힌다.", "isbn": "9788992831055", "category": "육아"},
    {"title": "0~7세 두뇌 육아", "author": "김영훈", "publisher": "지식너머", "description": "소아청소년과 전문의가 알려주는 뇌과학 기반 시기별 육아 전략.", "isbn": "9791185592596", "category": "육아"},
    {"title": "아이의 정서지능", "author": "존 가트맨", "publisher": "한국경제신문", "description": "정서 코칭 5단계. 감정을 다스리는 아이로 키우는 부모의 기술.", "isbn": "9788947543347", "category": "육아"},
    {"title": "몬테소리 육아", "author": "시몬 데이비스", "publisher": "토트", "description": "몬테소리 교육법을 집에서 실천하는 0~3세 육아 가이드.", "isbn": "9788992920971", "category": "육아"},
    {"title": "엄마 수업", "author": "법륜", "publisher": "정토출판", "description": "스님이 말하는 아이를 행복하게 키우는 부모의 마음가짐.", "isbn": "9788985961981", "category": "육아"},
    {"title": "부모와 다른 아이들", "author": "앤드루 솔로몬", "publisher": "열린책들", "description": "장애, 동성애, 천재성 등 나와 다른 아이를 키우는 부모들의 이야기.", "isbn": "9788932913001", "category": "육아"},
    {"title": "최고의 교육", "author": "로빈 스콰이어", "publisher": "물푸레", "description": "아이의 미래를 위한 7가지 교육 원칙. 핀란드에서 배우는 교육법.", "isbn": "9788955437447", "category": "육아"},
    {"title": "완벽한 부모는 없다", "author": "브루노 베텔하임", "publisher": "에코리브르", "description": "충분히 좋은 부모면 된다. 아동심리학자가 말하는 건강한 부모 역할.", "isbn": "9788990048912", "category": "육아"},
    {"title": "아이와 함께 자라는 부모", "author": "박재원", "publisher": "21세기북스", "description": "아이를 키우며 부모도 성장한다. 함께 성장하는 가족 관계의 심리학.", "isbn": "9788950946913", "category": "육아"},
    {"title": "호기심의 두 얼굴", "author": "토드 카시단", "publisher": "21세기북스", "description": "아이의 호기심을 키우는 법. 심리학이 밝히는 호기심과 창의성의 관계.", "isbn": "9788950939519", "category": "육아"},
]


def _book_to_dict(book: dict) -> dict:
    return {
        "title": book["title"],
        "author": book["author"],
        "publisher": book.get("publisher", ""),
        "thumbnail": book.get("thumbnail", ""),
        "description": book.get("description", ""),
        "isbn": book.get("isbn", ""),
        "category": book.get("category", ""),  # BOOK_DB에 있으면 카테고리 포함
    }


def _search_mock_books(query: str) -> list[dict]:
    query_lower = query.lower().strip()
    results = []
    for book in BOOK_DB:
        if (query_lower in book["title"].lower() or
                query_lower in book["author"].lower()):
            results.append(_book_to_dict(book))
            if len(results) >= 7:
                break
    return results


def _recommend_mock_books(keyword: str) -> list[dict]:
    return [
        _book_to_dict(b)
        for b in BOOK_DB
        if b.get("category") == keyword
    ][:10]


def _mock_reviews(book_title: str) -> list[dict]:
    return [
        {"title": f"{book_title} 독후감 — 아침 루틴이 바뀐 계기", "text": f"[{book_title} 독후감] 이 책을 읽고 나서 매일 아침 루틴이 완전히 바뀌었습니다. 저자는 하루의 첫 한 시간이 하루 전체를 결정한다고 말합니다. 특히 3장에서 소개한 '시간 블록킹' 기법은 업무 집중력을 높이는 데 탁월합니다.", "url": "https://blog.naver.com/mock/1"},
        {"title": f"{book_title} 서평 — 복리와 습관의 연결고리", "text": f"[{book_title} 서평] 투자자로서 이 책에서 가장 인상 깊었던 부분은 복리의 개념을 습관에 적용한 것입니다. 작은 행동 하나가 1%씩 개선될 때 1년 뒤 37배의 차이를 만든다는 수식은 정말 충격적이었습니다.", "url": "https://blog.naver.com/mock/2"},
        {"title": f"{book_title} 리뷰 — 육아에서 발견한 성장 마인드셋", "text": f"[{book_title} 리뷰] 육아 중에 읽었는데 아이와의 대화 방식을 완전히 바꿔줬습니다. 결과보다 과정을 칭찬하는 '성장 마인드셋' 챕터는 모든 부모가 읽어야 한다고 생각합니다.", "url": "https://blog.naver.com/mock/3"},
        {"title": f"{book_title} 독서 기록 — 2분 규칙으로 3개월 운동 유지", "text": f"[{book_title} 독서 기록] 건강 관리 측면에서 이 책의 '2분 규칙'은 정말 실용적입니다. 운동하기 싫은 날에도 일단 운동복만 입어보자는 전략으로 3개월째 매일 운동을 유지하고 있습니다.", "url": "https://blog.naver.com/mock/4"},
        {"title": f"{book_title} 완독 후기 — 목표보다 시스템이 중요하다", "text": f"[{book_title} 완독 후기] 직장에서 팀원들과 공유하고 싶은 내용이 가득했습니다. 특히 '시스템 vs 목표' 파트에서 목표보다 시스템을 구축하는 것이 장기적으로 더 효과적이라는 주장은 우리 팀의 업무 방식을 바꾸는 계기가 됐습니다.", "url": "https://blog.naver.com/mock/5"},
    ]


async def search_books(title: str, author: Optional[str] = None) -> list[dict]:
    if _is_mock():
        return _search_mock_books(title)
    query = f"{title} {author}" if author else title
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            NAVER_BOOK_URL,
            params={"query": query, "display": 7},
            headers=_naver_headers(),
        )
        resp.raise_for_status()
        items = resp.json().get("items", [])
    results = []
    for item in items:
        title_clean = _strip_html(item.get("title", ""))
        desc_clean = _strip_html(item.get("description", ""))
        results.append({
            "title": title_clean,
            "author": item.get("author", ""),
            "publisher": item.get("publisher", ""),
            "thumbnail": item.get("image", ""),
            "description": desc_clean,
            "isbn": item.get("isbn", ""),
            "category": _classify_from_text(title_clean, desc_clean) or "",
        })
    return results


async def search_book_reviews(book_title: str, author: str = "") -> list[dict]:
    """Returns list of {"text": str, "url": str} — at least 5 reviews for AI accuracy."""
    if _is_mock():
        return _mock_reviews(book_title)
    query = f"{book_title} {author} 서평 독후감" if author else f"{book_title} 서평 독후감"
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            NAVER_BLOG_URL,
            params={"query": query, "display": 10, "sort": "sim"},
            headers=_naver_headers(),
        )
        resp.raise_for_status()
        items = resp.json().get("items", [])
    reviews = []
    for item in items:
        title = _strip_html(item.get("title", ""))
        description = _strip_html(item.get("description", ""))
        url = item.get("link", "") or item.get("bloggerlink", "")
        if description:
            reviews.append({"title": title, "text": f"[{title}] {description}", "url": url})
    return reviews


# Maps each app category to two Naver book category keywords for diverse results.
# Queries match Naver's actual book category taxonomy (경제/경영, 자기계발, 유아 등).
CATEGORY_QUERIES: dict[str, list[str]] = {
    "투자": ["투자", "재테크"],
    "육아": ["육아", "자녀교육"],
    "자기계발": ["자기계발", "동기부여"],
    "업무": ["경영", "리더십"],
    "건강": ["건강", "운동"],
}


async def recommend_books_by_keyword(keyword: str) -> list[dict]:
    if _is_mock():
        return _recommend_mock_books(keyword)

    queries = CATEGORY_QUERIES.get(keyword, [keyword])
    seen_isbns: set[str] = set()
    bestsellers: list[dict] = []
    newbooks: list[dict] = []

    # First query: sort=sim → popularity/bestseller signal
    # Second query: sort=date → recent new releases (refreshes naturally over time)
    sorts = ["sim", "date"]

    async with httpx.AsyncClient() as client:
        for i, query in enumerate(queries):
            sort = sorts[i] if i < len(sorts) else "sim"
            bucket = bestsellers if sort == "sim" else newbooks
            resp = await client.get(
                NAVER_BOOK_URL,
                params={"query": query, "display": 7, "sort": sort},
                headers=_naver_headers(),
            )
            resp.raise_for_status()
            for item in resp.json().get("items", []):
                isbn = item.get("isbn", "")
                if isbn in seen_isbns:
                    continue
                seen_isbns.add(isbn)
                bucket.append({
                    "title": _strip_html(item.get("title", "")),
                    "author": item.get("author", ""),
                    "publisher": item.get("publisher", ""),
                    "thumbnail": item.get("image", ""),
                    "description": _strip_html(item.get("description", "")),
                    "isbn": isbn,
                    "category": keyword,
                })

    # Interleave: bestsellers first, fill remainder with new releases
    results: list[dict] = []
    for book in bestsellers[:6]:
        results.append(book)
    for book in newbooks:
        if len(results) >= 10:
            break
        if book["isbn"] not in {b["isbn"] for b in results}:
            results.append(book)

    return results


def _strip_html(text: str) -> str:
    import re
    return re.sub(r"<[^>]+>", "", text).strip()
