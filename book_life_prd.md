[PRD] 독서 실천 액션 플래너: Action Log
1. 프로젝트 개요
• 목적: 도서의 인사이트를 삶에 적용 가능한 15개 이상의 '구체적 액션'으로 변환.
• 핵심: 네이버 블로그 서평 기반의 실천적 데이터 추출 및 자동 카테고리 분류.

2. 핵심 기능 요구사항
2.1 데이터 수집 및 추천
• Search: Naver 도서 검색 API로 책 제목/저자 정보 수집.
• RAG Source: 네이버 검색 API로 해당 도서의 상위 블로그 서평 텍스트 수집.
• Discovery: 사용자 관심 키워드 입력 시 관련 양서 추천 기능.
2.2 AI 액션 제너레이터 (핵심 로직)
• Input: 수집된 서평 데이터 + 도서 메타데이터.
• Output (JSON): 15개 이상의 액션 아이템 생성.
• Point: 핵심 인사이트.
• Action: 당장 실행 가능한 구체적 행동 지침.
• Example: 책 속의 실제 비유나 저자가 제시한 사례.
• Page: 관련 챕터 및 페이지 정보(p.xx).
• Category: [투자, 육아, 자기계발, 업무, 건강] 중 자동 분류.
2.3 My Life 실천 관리
• Action Board: 선택한 아이템을 (책 제목) 실천 내용 형태로 저장.
• Auto Filter: 카테고리별 탭(Tab) 자동 분류 노출.
• Activity Log: 실천 여부 체크 및 실행 소감(텍스트/사진) 기록.

3. 기술 스택 (Tech Stack)
• Frontend: React Native
• Backend: Python FastAPI (LLM 오케스트레이션)
• AI: Claude 3.5 Sonnet API
• Database: Supabase (PostgreSQL)

4. Claude Code 개발 지시용 프롬프트
다음 요구사항에 따라 'Action Log' 앱의 백엔드와 프론트엔드를 구현하라:

1. 데이터 로직:
   - 사용자가 책 정보를 입력하면 네이버 블로그 검색 API를 시뮬레이션하여 서평 데이터를 수집하는 인터페이스 설계.
   - LLM 프롬프트: "서평 데이터에서 최소 15개의 액션 아이템을 추출하라. 반드시 책 속의 실제 사례와 페이지 번호를 포함하고, [투자, 육아, 자기계발, 업무, 건강] 중 하나로 자동 분류하여 JSON으로 반환하라."

2. UI/UX 구성:
   - 메인: 카테고리별 탭이 있는 실천 목록 'My Life'.
   - 탐색: 관심사 입력 시 책 추천 및 액션 카드를 스와이프하여 담는 'Insight View'.
   - 기록: 개별 액션 클릭 시 구체적 실천법과 페이지 정보를 보여주고 실행 내용을 메모하는 기능.

3. 데이터 스키마:
   - Books (id, title, author, category)
   - ActionItems (id, book_id, point, action, example, page)
   - UserLogs (id, action_item_id, status, note, created_at)


5. 단계별 개발 우선순위
• 1단계: 도서 검색 및 AI 액션 아이템 15개 추출 로직 (JSON 정규화).
• 2단계: My Life 저장 및 카테고리별 자동 분류 화면.
• 3단계: 실천 기록(메모) 및 페이지 정보 연동 상세 뷰.