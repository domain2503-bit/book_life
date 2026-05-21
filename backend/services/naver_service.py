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
    if any(w in text for w in ["ai", "인공지능", "4차산업", "디지털", "블록체인", "메타버스", "트렌드", "미래기술", "빅데이터", "플랫폼혁명"]):
        return "산업트렌드"
    if any(w in text for w in ["투자", "주식", "재테크", "펀드", "채권", "경영", "창업", "스타트업", "마케팅", "리더십", "비즈니스"]):
        return "경제경영"
    if any(w in text for w in ["육아", "유아", "자녀", "어린이", "임신", "출산", "태교", "아이의"]):
        return "유아"
    if any(w in text for w in ["건강", "운동법", "다이어트", "의학", "면역", "수면", "영양", "헬스"]):
        return "건강"
    if any(w in text for w in ["철학", "인문학", "역사", "사피엔스", "사회학", "인류"]):
        return "인문"
    if any(w in text for w in ["자기계발", "습관", "동기부여", "목표달성", "성공법칙"]):
        return "자기계발"
    return None


# 카테고리별 큐레이션 양서 DB
BOOK_DB = [
    # ── 경제경영 ──────────────────────────────────────────────────────────
    {"title": "현명한 투자자", "author": "벤저민 그레이엄", "publisher": "국일증권경제연구소", "description": "가치투자의 바이블. 워런 버핏이 '내 인생 최고의 책'이라 극찬한 투자 고전.", "isbn": "9788976544100", "category": "경제경영"},
    {"title": "돈의 심리학", "author": "모건 하우절", "publisher": "인플루엔셜", "description": "19개의 짧은 이야기로 읽는 부와 탐욕과 행복에 관한 심리학.", "isbn": "9791191056242", "category": "경제경영"},
    {"title": "돈의 속성", "author": "김승호", "publisher": "스노우폭스북스", "description": "돈을 다루는 법, 돈을 버는 법, 돈이 오게 하는 법. 스노우폭스 창업자의 돈 철학.", "isbn": "9791190100397", "category": "경제경영"},
    {"title": "부자 아빠 가난한 아빠", "author": "로버트 기요사키", "publisher": "민음인", "description": "학교에서 가르쳐주지 않는 돈과 투자의 진실. 부자들의 사고방식.", "isbn": "9788937460388", "category": "경제경영"},
    {"title": "부의 추월차선", "author": "MJ 드마코", "publisher": "토트출판사", "description": "평생 검약하며 기다리지 말고, 지금 당장 부를 만드는 추월차선 전략.", "isbn": "9788992920902", "category": "경제경영"},
    {"title": "피터 린치의 이기는 투자", "author": "피터 린치", "publisher": "국일증권경제연구소", "description": "월가의 전설 피터 린치가 알려주는 개인 투자자의 무기.", "isbn": "9788976544124", "category": "경제경영"},
    {"title": "워런 버핏 바이블", "author": "워런 버핏", "publisher": "에프엔미디어", "description": "오마하의 현인 워런 버핏의 투자 철학과 원칙을 집대성.", "isbn": "9791188754083", "category": "경제경영"},
    {"title": "생각에 관한 생각", "author": "대니얼 카너먼", "publisher": "김영사", "description": "노벨 경제학상 수상자가 밝히는 인간 판단의 두 가지 시스템.", "isbn": "9788934968771", "category": "경제경영"},
    {"title": "넛지", "author": "리처드 탈러, 캐스 선스타인", "publisher": "리더스북", "description": "노벨 경제학상 수상자의 행동경제학. 더 나은 선택을 유도하는 설계.", "isbn": "9788926408728", "category": "경제경영"},
    {"title": "하이 아웃풋 매니지먼트", "author": "앤드루 그로브", "publisher": "청림출판", "description": "인텔 CEO가 알려주는 관리자의 일. 어떻게 팀의 성과를 극대화할 것인가.", "isbn": "9788935211500", "category": "경제경영"},
    {"title": "실리콘밸리의 팀장들", "author": "킴 스콧", "publisher": "청림출판", "description": "완전한 솔직함. 팀원을 성장시키고 팀을 이끄는 리더십의 기술.", "isbn": "9788935213825", "category": "경제경영"},
    {"title": "제로 투 원", "author": "피터 틸", "publisher": "한국경제신문", "description": "페이팔 창업자가 말하는 창업과 혁신. 0에서 1을 만드는 스타트업 철학.", "isbn": "9788947540766", "category": "경제경영"},
    {"title": "린 스타트업", "author": "에릭 리스", "publisher": "인사이트", "description": "빠른 실험과 고객 피드백으로 낭비 없이 사업을 키우는 방법.", "isbn": "9788966260522", "category": "경제경영"},
    {"title": "좋은 기업을 넘어 위대한 기업으로", "author": "짐 콜린스", "publisher": "김영사", "description": "위대한 기업의 비밀. 11개 기업 분석으로 밝혀낸 탁월한 경영의 원칙.", "isbn": "9788934924524", "category": "경제경영"},
    {"title": "설득의 심리학", "author": "로버트 치알디니", "publisher": "21세기북스", "description": "세계 최고의 설득 전문가가 밝히는 동의를 이끌어내는 6가지 원칙.", "isbn": "9788950929671", "category": "경제경영"},
    {"title": "나는 왜 이 일을 하는가", "author": "사이먼 시넥", "publisher": "세계사", "description": "왜(WHY)에서 시작하라. 애플, 마틴 루터 킹이 성공한 공통 원리.", "isbn": "9788970604039", "category": "경제경영"},
    {"title": "초격차", "author": "권오현", "publisher": "쌤앤파커스", "description": "삼성전자 반도체 신화를 이끈 권오현 회장의 경영 철학과 리더십.", "isbn": "9791188791262", "category": "경제경영"},
    {"title": "세이노의 가르침", "author": "세이노", "publisher": "데이원", "description": "수십 년의 사업 경험으로 다듬어진 돈과 인생에 관한 냉철한 가르침.", "isbn": "9791194101192", "category": "경제경영"},
    {"title": "팀장의 탄생", "author": "줄리 조", "publisher": "더퀘스트", "description": "처음 팀장이 된 사람을 위한 실전 리더십 가이드.", "isbn": "9788965703242", "category": "경제경영"},
    {"title": "함께 자라기", "author": "김창준", "publisher": "인사이트", "description": "애자일 전문가가 말하는 함께 성장하는 팀과 조직 문화.", "isbn": "9788966262397", "category": "경제경영"},
    {"title": "블루오션 전략", "author": "W. 챈 김, 르네 마보안", "publisher": "교보문고", "description": "경쟁 없는 시장을 창조하라. 레드오션을 벗어나는 혁신 전략.", "isbn": "9788972918745", "category": "경제경영"},
    {"title": "괴짜경제학", "author": "스티븐 레빗, 스티븐 더브너", "publisher": "웅진지식하우스", "description": "경제학으로 세상의 숨겨진 면을 파헤친다. 데이터로 읽는 사회 현상.", "isbn": "9788901056418", "category": "경제경영"},
    {"title": "레버리지", "author": "롭 무어", "publisher": "다산북스", "description": "타인의 시간, 돈, 경험을 이용해 자신의 시간을 자유롭게 만드는 법.", "isbn": "9791130606316", "category": "경제경영"},
    {"title": "나는 주식 대신 달러를 산다", "author": "박성현", "publisher": "알에이치코리아", "description": "환율과 달러 자산으로 평생 돈 걱정 없이 사는 법.", "isbn": "9791162244319", "category": "경제경영"},
    # ── 자기계발 ──────────────────────────────────────────────────────────
    {"title": "아주 작은 습관의 힘", "author": "제임스 클리어", "publisher": "비즈니스북스", "description": "매일 1%씩 나아지는 습관의 복리 효과. 작은 변화가 놀라운 결과를 만드는 원리.", "isbn": "9791162540640", "category": "자기계발"},
    {"title": "원씽", "author": "게리 켈러", "publisher": "비즈니스북스", "description": "한 가지 중요한 것에 집중할 때 비범한 결과가 따라온다.", "isbn": "9788997497461", "category": "자기계발"},
    {"title": "미라클 모닝", "author": "할 엘로드", "publisher": "한빛비즈", "description": "아침 1시간이 인생을 바꾼다. 성공한 사람들의 아침 루틴 6가지 습관.", "isbn": "9791185831022", "category": "자기계발"},
    {"title": "딥 워크", "author": "칼 뉴포트", "publisher": "민음인", "description": "집중력이 새로운 IQ다. 방해 없이 몰입하는 능력이 21세기 핵심 경쟁력.", "isbn": "9788937461071", "category": "자기계발"},
    {"title": "그릿", "author": "앤절라 더크워스", "publisher": "비즈니스북스", "description": "재능보다 열정과 끈기가 성공을 결정한다. 세계 최고들의 공통점.", "isbn": "9791162540244", "category": "자기계발"},
    {"title": "아웃라이어", "author": "말콤 글래드웰", "publisher": "김영사", "description": "1만 시간의 법칙. 성공한 사람들의 숨겨진 기회와 맥락을 파헤친다.", "isbn": "9788934936756", "category": "자기계발"},
    {"title": "마인드셋", "author": "캐럴 드웩", "publisher": "스몰빅라이프", "description": "성장 마인드셋 vs 고정 마인드셋. 어떤 마음가짐이 인생을 바꾸는가.", "isbn": "9791188556120", "category": "자기계발"},
    {"title": "에센셜리즘", "author": "그레그 맥커운", "publisher": "알에이치코리아", "description": "더 적게, 그러나 더 잘하라. 본질에 집중하는 삶의 기술.", "isbn": "9788925549750", "category": "자기계발"},
    {"title": "몰입의 즐거움", "author": "미하이 칙센트미하이", "publisher": "해냄", "description": "최적 경험의 심리학. 진정한 행복은 몰입에서 온다.", "isbn": "9788973372553", "category": "자기계발"},
    {"title": "타이탄의 도구들", "author": "팀 페리스", "publisher": "토네이도", "description": "세계 최고들의 습관, 루틴, 도구를 200명 인터뷰로 정리했다.", "isbn": "9791187807254", "category": "자기계발"},
    {"title": "7가지 습관", "author": "스티븐 코비", "publisher": "김영사", "description": "원칙 중심의 삶. 성공하는 사람들의 7가지 습관을 체계적으로 정리했다.", "isbn": "9788934913719", "category": "자기계발"},
    {"title": "미움받을 용기", "author": "기시미 이치로, 고가 후미타케", "publisher": "인플루엔셜", "description": "아들러 심리학으로 읽는 자유와 행복. 타인의 시선에서 벗어나는 용기.", "isbn": "9788996991342", "category": "자기계발"},
    {"title": "신경 끄기의 기술", "author": "마크 맨슨", "publisher": "갤리온", "description": "중요한 것에만 에너지를 쓰는 법. 역설적 행복론의 쿨한 접근.", "isbn": "9791188207299", "category": "자기계발"},
    {"title": "죽음의 수용소에서", "author": "빅터 프랭클", "publisher": "청아출판사", "description": "나치 수용소에서 살아남은 정신과 의사가 발견한 삶의 의미.", "isbn": "9788936410919", "category": "자기계발"},
    {"title": "완벽한 공부법", "author": "고영성, 신영준", "publisher": "로크미디어", "description": "뇌과학과 심리학이 증명한 최고의 공부 전략.", "isbn": "9788925564500", "category": "자기계발"},
    {"title": "당신의 뇌는 최적화를 원한다", "author": "가바사와 시온", "publisher": "쌤앤파커스", "description": "정신과 의사가 알려주는 뇌를 100% 활용하는 최강의 집중법.", "isbn": "9791165341138", "category": "자기계발"},
    {"title": "역행자", "author": "자청", "publisher": "웅진지식하우스", "description": "자수성가한 사업가가 공개하는 운명을 거스르는 7단계 인생 공략법.", "isbn": "9788901262598", "category": "자기계발"},
    {"title": "나는 4시간만 일한다", "author": "팀 페리스", "publisher": "다산북스", "description": "주 4시간 근무로 이상적인 삶을 설계하는 라이프스타일 디자인.", "isbn": "9788963700700", "category": "자기계발"},
    # ── 인문 ──────────────────────────────────────────────────────────────
    {"title": "사피엔스", "author": "유발 하라리", "publisher": "김영사", "description": "인류의 탄생부터 현재까지. 호모 사피엔스가 지구를 정복한 비밀을 파헤친다.", "isbn": "9788934972464", "category": "인문"},
    {"title": "호모 데우스", "author": "유발 하라리", "publisher": "김영사", "description": "신이 되려는 인간. 불멸, 행복, 신성을 추구하는 미래 인류의 이야기.", "isbn": "9788934979678", "category": "인문"},
    {"title": "21세기를 위한 21가지 제언", "author": "유발 하라리", "publisher": "김영사", "description": "지금 이 순간 인류가 직면한 21가지 가장 시급한 질문들.", "isbn": "9788934985907", "category": "인문"},
    {"title": "총, 균, 쇠", "author": "재레드 다이아몬드", "publisher": "문학사상", "description": "왜 어떤 문명은 다른 문명을 정복했는가. 인류 불평등의 근원을 밝힌 대작.", "isbn": "9788970128764", "category": "인문"},
    {"title": "코스모스", "author": "칼 세이건", "publisher": "사이언스북스", "description": "별들의 세계로 떠나는 장대한 여행. 우주와 생명의 신비를 풀어낸 고전.", "isbn": "9788983712318", "category": "인문"},
    {"title": "정의란 무엇인가", "author": "마이클 샌델", "publisher": "김영사", "description": "하버드 최고 강의. 공리주의부터 자유주의까지 정의의 의미를 탐구한다.", "isbn": "9788974835279", "category": "인문"},
    {"title": "공정하다는 착각", "author": "마이클 샌델", "publisher": "와이즈베리", "description": "능력주의는 왜 공정하지 않은가. 성공의 의미와 학력 사회의 문제를 파헤친다.", "isbn": "9791191056860", "category": "인문"},
    {"title": "이기적 유전자", "author": "리처드 도킨스", "publisher": "을유문화사", "description": "진화의 단위는 유전자다. 생명의 본질을 유전자 중심으로 설명하는 혁명적 저작.", "isbn": "9788932920481", "category": "인문"},
    {"title": "철학은 어떻게 삶의 무기가 되는가", "author": "야마구치 슈", "publisher": "다산초당", "description": "비즈니스 현장에서 바로 쓰는 철학. 50개 철학 개념으로 생각을 날카롭게 만드는 법.", "isbn": "9791130614014", "category": "인문"},
    {"title": "시간의 역사", "author": "스티븐 호킹", "publisher": "까치", "description": "빅뱅부터 블랙홀까지. 스티븐 호킹이 쓴 우주의 역사와 물리학의 경이.", "isbn": "9788972915423", "category": "인문"},
    {"title": "생각의 탄생", "author": "로버트 루트번스타인, 미셸 루트번스타인", "publisher": "에코의서재", "description": "창의적 사고는 어디서 오는가. 다빈치부터 아인슈타인까지 창조적 천재들의 공통점.", "isbn": "9788960510685", "category": "인문"},
    {"title": "불안", "author": "알랭 드 보통", "publisher": "이레", "description": "현대인의 불안을 철학적으로 분석한다. 지위와 성공에 집착하는 우리 시대의 이야기.", "isbn": "9788901057019", "category": "인문"},
    {"title": "왜 세계의 절반은 굶주리는가", "author": "장 지글러", "publisher": "갈라파고스", "description": "UN 인권위원이 고발하는 세계 기아의 실상. 풍요의 시대에 굶어 죽는 이유.", "isbn": "9788990809186", "category": "인문"},
    {"title": "언어의 온도", "author": "이기주", "publisher": "말글터", "description": "따뜻하고 다정한 말의 힘. 우리 삶을 변화시키는 언어의 섬세한 결.", "isbn": "9791186492390", "category": "인문"},
    {"title": "지도 밖으로 행군하라", "author": "한비야", "publisher": "푸른숲", "description": "세계 오지를 누빈 한비야의 도전과 성찰. 삶의 경계를 넓히는 용기.", "isbn": "9788901054223", "category": "인문"},
    {"title": "나는 누구인가", "author": "리하르트 다비트 프레히트", "publisher": "21세기북스", "description": "철학이 답하는 인간에 대한 근본 질문. 현대 철학의 핵심을 쉽게 풀어낸 입문서.", "isbn": "9788950919115", "category": "인문"},
    # ── 건강 ──────────────────────────────────────────────────────────────
    {"title": "운동의 뇌과학", "author": "존 레이티", "publisher": "북섬", "description": "운동이 뇌에 미치는 혁명적 영향. 운동은 최고의 항우울제이자 집중력 향상제다.", "isbn": "9788991965379", "category": "건강"},
    {"title": "잠의 과학", "author": "매슈 워커", "publisher": "열린책들", "description": "수면 전문가가 밝히는 수면의 놀라운 힘. 잠이 부족하면 뇌와 몸이 망가진다.", "isbn": "9788932918136", "category": "건강"},
    {"title": "식사가 잘못됐습니다", "author": "마키타 젠지", "publisher": "더난출판", "description": "혈당 스파이크를 잡아라. 당질 제한으로 몸과 마음을 바꾸는 식사법.", "isbn": "9791187128625", "category": "건강"},
    {"title": "스트레스의 힘", "author": "켈리 맥고니걸", "publisher": "21세기북스", "description": "스트레스는 적이 아니다. 스트레스를 친구로 만드는 마음챙김 전략.", "isbn": "9788950970017", "category": "건강"},
    {"title": "텔로미어 효과", "author": "엘리자베스 블랙번, 엘리사 에펠", "publisher": "알에이치코리아", "description": "노벨상 수상 과학자가 밝히는 세포 수준에서 노화를 늦추는 방법.", "isbn": "9791162240526", "category": "건강"},
    {"title": "아픔이 길이 되려면", "author": "김승섭", "publisher": "동아시아", "description": "사회역학자가 쓴 질병과 사회의 관계. 왜 어떤 사람들은 더 아픈가.", "isbn": "9788962623048", "category": "건강"},
    {"title": "노화의 종말", "author": "데이비드 싱클레어", "publisher": "부키", "description": "하버드 의대 교수가 밝히는 노화의 비밀. 인류가 노화를 정복하는 날이 온다.", "isbn": "9788960518117", "category": "건강"},
    {"title": "장이 뇌다", "author": "줄리아 엔더스", "publisher": "와이즈베리", "description": "장 건강이 뇌와 감정을 결정한다. 우리 몸의 숨겨진 두 번째 뇌, 장의 비밀.", "isbn": "9791185718583", "category": "건강"},
    {"title": "내 몸 사용설명서", "author": "마이클 로이젠, 메멧 오즈", "publisher": "김영사", "description": "우리 몸의 작동 원리를 알면 건강하게 오래 살 수 있다.", "isbn": "9788934921943", "category": "건강"},
    {"title": "면역에 관하여", "author": "율라 비스", "publisher": "열린책들", "description": "백신과 면역에 관한 두려움과 신화를 명쾌하게 파헤치는 에세이.", "isbn": "9788932917634", "category": "건강"},
    {"title": "당신은 뇌를 고칠 수 있다", "author": "톰 오브라이언", "publisher": "한문화", "description": "글루텐과 장 건강이 뇌에 미치는 영향. 뇌 기능을 최적화하는 식이 전략.", "isbn": "9788956027272", "category": "건강"},
    {"title": "최강의 식사", "author": "데이브 아스프리", "publisher": "앵글북스", "description": "방탄커피 창시자가 알려주는 뇌와 몸의 성능을 높이는 최강 식이요법.", "isbn": "9791186247747", "category": "건강"},
    {"title": "마음챙김", "author": "존 카밧진", "publisher": "불광출판사", "description": "스트레스, 통증, 질병을 이겨내는 마음챙김 명상. MBSR 창시자의 핵심 가이드.", "isbn": "9788974797102", "category": "건강"},
    {"title": "우리 몸이 세계라면", "author": "김승섭", "publisher": "동아시아", "description": "차별과 혐오가 몸에 새기는 상처. 소수자 건강의 사회적 결정요인을 파헤친다.", "isbn": "9788962623277", "category": "건강"},
    # ── 유아 ──────────────────────────────────────────────────────────────
    {"title": "아이의 사생활", "author": "EBS 제작팀", "publisher": "지식채널", "description": "EBS 다큐 원작. 아이의 뇌 발달, 기질, 사회성의 비밀을 과학적으로 밝힌다.", "isbn": "9788992831055", "category": "유아"},
    {"title": "0~7세 두뇌 육아", "author": "김영훈", "publisher": "지식너머", "description": "소아청소년과 전문의가 알려주는 뇌과학 기반 시기별 육아 전략.", "isbn": "9791185592596", "category": "유아"},
    {"title": "아이의 정서지능", "author": "존 가트맨", "publisher": "한국경제신문", "description": "정서 코칭 5단계. 감정을 다스리는 아이로 키우는 부모의 기술.", "isbn": "9788947543347", "category": "유아"},
    {"title": "몬테소리 육아", "author": "시몬 데이비스", "publisher": "토트", "description": "몬테소리 교육법을 집에서 실천하는 0~3세 육아 가이드.", "isbn": "9788992920971", "category": "유아"},
    {"title": "엄마 수업", "author": "법륜", "publisher": "정토출판", "description": "스님이 말하는 아이를 행복하게 키우는 부모의 마음가짐.", "isbn": "9788985961981", "category": "유아"},
    {"title": "부모와 다른 아이들", "author": "앤드루 솔로몬", "publisher": "열린책들", "description": "장애, 동성애, 천재성 등 나와 다른 아이를 키우는 부모들의 이야기.", "isbn": "9788932913001", "category": "유아"},
    {"title": "완벽한 부모는 없다", "author": "브루노 베텔하임", "publisher": "에코리브르", "description": "충분히 좋은 부모면 된다. 아동심리학자가 말하는 건강한 부모 역할.", "isbn": "9788990048912", "category": "유아"},
    {"title": "아이와 함께 자라는 부모", "author": "박재원", "publisher": "21세기북스", "description": "아이를 키우며 부모도 성장한다. 함께 성장하는 가족 관계의 심리학.", "isbn": "9788950946913", "category": "유아"},
    {"title": "어린이라는 세계", "author": "김소영", "publisher": "사계절", "description": "어린이의 눈으로 본 세상. 어린이책 작가가 전하는 아이들의 마음과 세계.", "isbn": "9791160947069", "category": "유아"},
    {"title": "아이의 뇌", "author": "다니엘 시겔, 티나 페인 브라이슨", "publisher": "마음이음", "description": "12가지 전략으로 아이의 뇌를 통합적으로 발달시키는 법.", "isbn": "9791185293141", "category": "유아"},
    {"title": "긍정의 훈육", "author": "제인 넬슨", "publisher": "에듀니티", "description": "벌과 보상 없이 아이를 키우는 법. 민주적 육아의 실천 가이드.", "isbn": "9788996648635", "category": "유아"},
    {"title": "최고의 교육", "author": "로빈 스콰이어", "publisher": "물푸레", "description": "아이의 미래를 위한 7가지 교육 원칙. 핀란드에서 배우는 교육법.", "isbn": "9788955437447", "category": "유아"},
    {"title": "부모 역할 훈련", "author": "토머스 고든", "publisher": "양철북", "description": "T.E.T. 효과적인 부모 역할 훈련. 권위 없는 대화로 아이와 소통하는 법.", "isbn": "9788990463166", "category": "유아"},
    # ── 산업트렌드 ────────────────────────────────────────────────────────
    {"title": "특이점이 온다", "author": "레이 커즈와일", "publisher": "김영사", "description": "2029년 AI가 인간을 초월한다. 기술적 특이점으로 나아가는 인류의 미래.", "isbn": "9788934920762", "category": "산업트렌드"},
    {"title": "AI 슈퍼파워", "author": "카이푸 리", "publisher": "이콘", "description": "미중 AI 패권 전쟁. 구글 차이나 CEO가 분석하는 인공지능 시대의 미래.", "isbn": "9791155975213", "category": "산업트렌드"},
    {"title": "4차 산업혁명", "author": "클라우스 슈밥", "publisher": "새로운현재", "description": "다보스 포럼 회장이 말하는 4차 산업혁명. 인간과 기계의 경계가 무너지는 시대.", "isbn": "9791195508747", "category": "산업트렌드"},
    {"title": "2030 축의 전환", "author": "마우로 기옌", "publisher": "리더스북", "description": "2030년을 지배할 8가지 거대 트렌드. 세계는 어떻게 바뀌는가.", "isbn": "9788925563985", "category": "산업트렌드"},
    {"title": "부의 미래", "author": "앨빈 토플러", "publisher": "청림출판", "description": "제3의 물결 이후 새로운 부의 법칙. 지식 자본이 이끄는 혁명적 변화.", "isbn": "9788935212538", "category": "산업트렌드"},
    {"title": "세계는 평평하다", "author": "토머스 프리드먼", "publisher": "창해", "description": "세계화가 만든 평평한 운동장. 디지털 혁명이 바꿔놓은 글로벌 경쟁의 룰.", "isbn": "9788979194447", "category": "산업트렌드"},
    {"title": "한계비용 제로 사회", "author": "제러미 리프킨", "publisher": "민음사", "description": "공유경제가 자본주의를 대체한다. 협력적 공유사회의 도래를 예언한다.", "isbn": "9788937461279", "category": "산업트렌드"},
    {"title": "플랫폼 레볼루션", "author": "마셜 밴 앨스타인 외", "publisher": "부키", "description": "파이프라인 기업을 무너뜨리는 플랫폼의 경제학. 디지털 플랫폼 비즈니스의 원리.", "isbn": "9788960516823", "category": "산업트렌드"},
    {"title": "트렌드 코리아 2025", "author": "김난도 외", "publisher": "미래의창", "description": "서울대 소비트렌드분석센터가 제시하는 2025년 한국 사회 10대 트렌드.", "isbn": "9788959898497", "category": "산업트렌드"},
    {"title": "블록체인 혁명", "author": "돈 탭스콧, 알렉스 탭스콧", "publisher": "을유문화사", "description": "신뢰 프로토콜 블록체인이 금융·비즈니스·정부를 어떻게 바꾸는가.", "isbn": "9788932475752", "category": "산업트렌드"},
    {"title": "ChatGPT 쇼크", "author": "반병현", "publisher": "동아시아", "description": "ChatGPT가 불러온 AI 혁명. 일과 창의성의 미래를 바꾸는 생성 AI의 충격.", "isbn": "9788962623796", "category": "산업트렌드"},
    {"title": "메타버스", "author": "김상균", "publisher": "플랜비디자인", "description": "메타버스가 만드는 새로운 세계. 가상 세계가 현실을 대체하는 미래.", "isbn": "9791165342067", "category": "산업트렌드"},
    {"title": "ESG 경영혁명", "author": "이재혁 외", "publisher": "21세기북스", "description": "ESG가 기업의 생존을 결정한다. 환경·사회·지배구조가 이끄는 새로운 자본주의.", "isbn": "9788950987442", "category": "산업트렌드"},
    {"title": "제4차 산업혁명 더 넥스트", "author": "클라우스 슈밥", "publisher": "새로운현재", "description": "4차 산업혁명 이후 인류의 미래. 기술이 인간을 어떻게 재정의하는가.", "isbn": "9791195508754", "category": "산업트렌드"},
    {"title": "넥스트 이코노미", "author": "최윤식", "publisher": "이지퍼블리싱", "description": "미래학자가 예측하는 10년 후 경제 지형도. 어떤 산업이 살아남는가.", "isbn": "9788994475844", "category": "산업트렌드"},
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
    "경제경영": ["경제경영", "재테크"],
    "자기계발": ["자기계발", "동기부여"],
    "인문": ["인문학", "철학"],
    "건강": ["건강", "운동"],
    "유아": ["육아", "자녀교육"],
    "산업트렌드": ["트렌드", "미래기술"],
}


async def recommend_books_by_keyword(keyword: str) -> list[dict]:
    # 큐레이션 양서 항상 포함
    curated = [{**_book_to_dict(b), "source": "curated"} for b in BOOK_DB if b.get("category") == keyword]

    if _is_mock():
        return curated

    curated_isbns = {b["isbn"] for b in curated if b.get("isbn")}
    seen_isbns = set(curated_isbns)
    queries = CATEGORY_QUERIES.get(keyword, [keyword])
    naver_books: list[dict] = []

    async with httpx.AsyncClient() as client:
        for i, query in enumerate(queries):
            sort = "sim" if i == 0 else "date"
            resp = await client.get(
                NAVER_BOOK_URL,
                params={"query": query, "display": 10, "sort": sort},
                headers=_naver_headers(),
            )
            resp.raise_for_status()
            for item in resp.json().get("items", []):
                isbn = item.get("isbn", "")
                if isbn and isbn in seen_isbns:
                    continue
                if isbn:
                    seen_isbns.add(isbn)
                naver_books.append({
                    "title": _strip_html(item.get("title", "")),
                    "author": item.get("author", ""),
                    "publisher": item.get("publisher", ""),
                    "thumbnail": item.get("image", ""),
                    "description": _strip_html(item.get("description", "")),
                    "isbn": isbn,
                    "category": keyword,
                    "source": "naver",
                })

    supplement = naver_books[:max(0, 40 - len(curated))]
    return curated + supplement


def _strip_html(text: str) -> str:
    import re
    return re.sub(r"<[^>]+>", "", text).strip()
