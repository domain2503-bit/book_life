"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  searchBooks,
  recommendBooks,
  generateActions,
  upsertLog,
  getLogs,
} from "@/lib/api";
import { getCategoryColor, CATEGORY_ICONS } from "@/lib/theme";
import {
  CATEGORIES,
  type Book,
  type ActionItem,
  type GeneratedData,
  type UserLog,
} from "@/lib/types";
import ActionDetailModal from "@/components/ActionDetailModal";
import Toast from "@/components/Toast";

const STEPS = [
  { emoji: "🍋", label: "서평 수확 중", sub: "독자들의 리뷰를 따오고 있어요" },
  { emoji: "⚙️", label: "재료 분쇄 중", sub: "핵심 내용을 잘게 부수고 있어요" },
  { emoji: "🧪", label: "착즙 진행 중", sub: "AI가 책의 에센스를 짜내고 있어요" },
  { emoji: "📋", label: "실천 플랜 병입 중", sub: "오늘 바로 실행할 수 있는 액션 플랜을 담고 있어요" },
];

const JUICE_GOAL = 5;

type PageView = "home" | "loading" | "actions";

export default function Home() {
  const [view, setView] = useState<PageView>("home");

  const [searchText, setSearchText] = useState("");
  const [suggestions, setSuggestions] = useState<Book[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [autocompleteLoading, setAutocompleteLoading] = useState(false);
  const [searchFired, setSearchFired] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [bookListTitle, setBookListTitle] = useState("");
  const [categoryLoading, setCategoryLoading] = useState(false);

  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [longWait, setLongWait] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [errorBook, setErrorBook] = useState<Book | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [generated, setGenerated] = useState<GeneratedData | null>(null);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const [modalItem, setModalItem] = useState<ActionItem | null>(null);
  const [modalLog, setModalLog] = useState<UserLog | null>(null);

  const [toastMsg, setToastMsg] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [juiceCount, setJuiceCount] = useState(0);

  useEffect(() => {
    getLogs()
      .then((res) => {
        const now = new Date();
        const count = (res.logs ?? []).filter((l: UserLog) => {
          if (l.status !== "done") return false;
          const d = new Date(l.created_at);
          return (
            d.getMonth() === now.getMonth() &&
            d.getFullYear() === now.getFullYear()
          );
        }).length;
        setJuiceCount(count);
      })
      .catch(() => {});
  }, []);

  function showToast(msg: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMsg(msg);
    setToastVisible(true);
    toastTimer.current = setTimeout(() => setToastVisible(false), 2500);
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchText.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      setSearchFired(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearchFired(true);
      setAutocompleteLoading(true);
      try {
        const res = await searchBooks(searchText.trim());
        setSuggestions(res.books ?? []);
        setShowDropdown((res.books ?? []).length > 0);
      } catch {
        setSuggestions([]);
        setShowDropdown(false);
      } finally {
        setAutocompleteLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchText]);

  useEffect(() => {
    if (view !== "loading") {
      setCurrentStep(0);
      setLongWait(false);
      return;
    }
    setCurrentStep(0);
    setLongWait(false);
    const delays = [8000, 20000, 35000];
    const timers = delays.map((d, i) =>
      setTimeout(() => setCurrentStep(i + 1), d)
    );
    const longTimer = setTimeout(() => setLongWait(true), 60000);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(longTimer);
    };
  }, [view]);

  const startGenerating = useCallback(async (book: Book) => {
    setSelectedBook(book);
    setGenerationError(null);
    setErrorBook(null);
    setView("loading");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await generateActions(
        book.title,
        book.author ?? "",
        book.category,
        controller.signal
      );
      if (controller.signal.aborted) return;

      const generatedData: GeneratedData = {
        bookTitle: book.title,
        bookThumbnail: book.thumbnail ?? "",
        bookCategory: res.book_category,
        bookSummary: res.book_summary,
        reviewSources: res.review_sources ?? [],
        actionItems: res.action_items ?? [],
      };
      setGenerated(generatedData);
      setSummaryExpanded(false);

      try {
        const logsRes = await getLogs();
        const ids = new Set<string>(
          (logsRes.logs ?? []).map((l: UserLog) => l.action_item_id)
        );
        setSavedIds(ids);
      } catch {}

      setView("actions");
    } catch (e: any) {
      if (controller.signal.aborted) return;
      const status = e?.status;
      const detail = e?.detail ?? "";
      const msg =
        status === 429 ||
        detail.includes("429") ||
        detail.includes("RESOURCE_EXHAUSTED")
          ? "AI 사용량 한도를 초과했습니다.\n잠시 후 다시 시도해 주세요."
          : status === 504 || status === 502
          ? "서버 응답 시간이 초과됐습니다.\n잠시 후 다시 시도해 주세요."
          : detail || "착즙 중 오류가 발생했습니다.";
      setErrorBook(book);
      setGenerationError(msg);
      setView("home");
    } finally {
      if (!controller.signal.aborted) setSelectedBook(null);
    }
  }, []);

  const handleCategoryTap = async (cat: string) => {
    if (selectedCategory === cat) {
      setSelectedCategory(null);
      setBooks([]);
      return;
    }
    setSelectedCategory(cat);
    setShowDropdown(false);
    setCategoryLoading(true);
    try {
      const res = await recommendBooks(cat);
      setBooks(res.books ?? []);
      setBookListTitle(`${cat} 엄선 도서`);
    } catch {
      alert("도서 추천 중 오류가 발생했습니다.");
    } finally {
      setCategoryLoading(false);
    }
  };

  const handleQuickSave = async (item: ActionItem) => {
    if (savedIds.has(item.id)) return;
    try {
      await upsertLog(item.id, "pending");
      setSavedIds((prev) => new Set([...prev, item.id]));
      showToast("🍹 내 책즙 저장고에 안전하게 보관했어요.");
    } catch {
      alert("저장 중 오류가 발생했습니다.");
    }
  };

  const openModal = async (item: ActionItem) => {
    setModalLog(null);
    setModalItem(item);
    try {
      const res = await getLogs(item.id);
      setModalLog(res.logs?.[0] ?? null);
    } catch {}
  };

  // ── 로딩 화면 ─────────────────────────────────────────────────────────────
  if (view === "loading") {
    const step = STEPS[Math.min(currentStep, STEPS.length - 1)];
    const pct = Math.min(((currentStep + 1) / STEPS.length) * 100, 100);

    return (
      <main className="min-h-screen bg-bg flex items-center justify-center p-6">
        <div className="w-full max-w-app bg-white rounded-3xl shadow-card p-8 flex flex-col items-center">
          {/* 책 표지 */}
          {selectedBook?.thumbnail ? (
            <Image
              src={selectedBook.thumbnail}
              alt={selectedBook.title}
              width={72}
              height={96}
              className="rounded-xl object-cover mb-5 shadow-sm2"
            />
          ) : (
            <div className="w-[72px] h-24 bg-primary-light rounded-xl flex items-center justify-center mb-5 text-3xl shadow-sm2">
              📚
            </div>
          )}

          <p className="text-base font-bold text-text-main text-center leading-snug mb-1 px-2">
            {selectedBook?.title}
          </p>
          {selectedBook?.author && (
            <p className="text-sm text-text-muted mb-6">{selectedBook.author}</p>
          )}

          {/* 진행 바 */}
          <div className="w-full bg-gray-100 rounded-full h-1.5 mb-6 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>

          {/* 현재 스텝 */}
          <div className="w-full space-y-2 mb-6">
            {STEPS.map((s, i) => {
              const isActive = i === currentStep;
              const isDone = i < currentStep;
              return (
                <div
                  key={i}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                    isActive
                      ? "bg-primary-light border border-orange-200"
                      : isDone
                      ? "opacity-40"
                      : "opacity-20"
                  }`}
                >
                  <span className={`text-lg ${isActive ? "animate-bounce" : ""}`}>
                    {s.emoji}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${isActive ? "text-primary" : "text-text-main"}`}>
                      {s.label}
                    </p>
                    {isActive && (
                      <p className="text-xs text-text-muted mt-0.5">{s.sub}</p>
                    )}
                  </div>
                  {isDone && <span className="text-success text-sm font-bold">✓</span>}
                  {isActive && (
                    <div className="flex gap-1">
                      {[0, 1, 2].map((d) => (
                        <div
                          key={d}
                          className="w-1 h-1 bg-primary rounded-full animate-bounce"
                          style={{ animationDelay: `${d * 150}ms` }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-xs text-text-light mb-1">
            고농축 착즙에 약 40~60초 정도 걸려요.
          </p>
          {longWait && (
            <p className="text-xs text-primary text-center leading-5 mb-1">
              신선한 착즙을 위해 꼼꼼히 필터링 중이에요.{"\n"}잠시만 기다려 주세요! 🍋
            </p>
          )}
          <button
            onClick={() => {
              abortRef.current?.abort();
              setView("home");
              setSelectedBook(null);
            }}
            className="mt-4 px-8 py-2.5 rounded-xl border border-border text-sm text-text-muted font-medium hover:bg-gray-50 transition-colors"
          >
            착즙 멈추기
          </button>
        </div>
      </main>
    );
  }

  // ── 액션 목록 화면 ─────────────────────────────────────────────────────────
  if (view === "actions" && generated) {
    const catColor = getCategoryColor(generated.bookCategory);
    const savedCount = generated.actionItems.filter((i) =>
      savedIds.has(i.id)
    ).length;

    return (
      <main className="min-h-screen bg-bg">
        {/* 스티키 헤더 */}
        <div className="bg-white border-b border-border sticky top-0 z-10 shadow-sm2">
          <div className="max-w-app mx-auto flex items-center px-4 py-3.5 gap-3">
            <button
              onClick={() => { setView("home"); setGenerated(null); }}
              className="text-sm font-semibold text-primary"
            >
              ← 홈
            </button>
            <p className="flex-1 text-sm font-bold text-text-main truncate">
              {generated.bookTitle}
            </p>
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-bold px-2.5 py-1 rounded-lg"
                style={{ background: catColor + "20", color: catColor }}
              >
                {savedCount}/{generated.actionItems.length}
              </span>
              <Link
                href="/my-life"
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ background: "#ff7a0018", color: "#ff7a00" }}
              >
                🧃
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-app mx-auto pb-12">
          {/* 책 요약 카드 */}
          <div className="mx-4 mt-5 mb-3 bg-white rounded-2xl shadow-sm2 border border-gray-50 p-4">
            <div className="flex gap-4 items-start">
              {generated.bookThumbnail ? (
                <Image
                  src={generated.bookThumbnail}
                  alt={generated.bookTitle}
                  width={56}
                  height={76}
                  className="rounded-lg object-cover flex-shrink-0 shadow-sm2"
                />
              ) : (
                <div className="w-14 h-[76px] rounded-lg bg-primary-light flex items-center justify-center text-xl flex-shrink-0">
                  📚
                </div>
              )}
              <div className="flex-1 min-w-0">
                <span
                  className="inline-block text-xs font-bold px-2 py-0.5 rounded-md mb-2"
                  style={{ background: catColor + "20", color: catColor }}
                >
                  {generated.bookCategory}
                </span>
                <p className="text-sm font-bold text-text-main leading-snug">
                  {generated.bookTitle}
                </p>
                <p className="text-xs text-text-muted mt-1.5">
                  착즙 완료된 인사이트 {generated.actionItems.length}개
                </p>
              </div>
            </div>
            {generated.bookSummary && (
              <div className="mt-3 pt-3 border-t border-gray-50">
                <p
                  className={`text-xs text-text-secondary leading-5 ${
                    summaryExpanded ? "" : "line-clamp-3"
                  }`}
                >
                  {generated.bookSummary}
                </p>
                <button
                  onClick={() => setSummaryExpanded((v) => !v)}
                  className="text-xs text-primary font-semibold mt-1.5"
                >
                  {summaryExpanded ? "▲ 접기" : "▼ 핵심 에센스 보기"}
                </button>
              </div>
            )}
          </div>

          {/* 참고 서평 */}
          {generated.reviewSources.length > 0 && (
            <div className="mx-4 mb-3 bg-white rounded-2xl shadow-sm2 border border-gray-50 p-4">
              <p className="text-xs font-bold text-text-muted mb-3">
                📎 분석에 함께 들어간 서평 {generated.reviewSources.length}개
              </p>
              <div className="space-y-0">
                {generated.reviewSources.slice(0, 5).map((s, i) => (
                  <a
                    key={i}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-3 py-2.5 ${
                      i < Math.min(generated.reviewSources.length, 5) - 1
                        ? "border-b border-gray-50"
                        : ""
                    }`}
                  >
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                      style={{ background: "#ff7a0018", color: "#ff7a00" }}
                    >
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      {s.title && (
                        <p className="text-xs font-medium text-text-main truncate">
                          {s.title}
                        </p>
                      )}
                      <p className="text-[10px] text-text-light truncate mt-0.5">
                        {s.url}
                      </p>
                    </div>
                    <span className="text-text-light">›</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* 액션 아이템 목록 */}
          <div className="px-4 space-y-2">
            {generated.actionItems.map((item, idx) => {
              const c = getCategoryColor(item.category);
              const isSaved = savedIds.has(item.id);
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl shadow-sm2 border border-gray-50 overflow-hidden card-hover cursor-pointer"
                  onClick={() => openModal(item)}
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      {/* 번호 뱃지 */}
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5"
                        style={{ background: isSaved ? "#e8f9ee" : c + "20", color: isSaved ? "#2ebd59" : c }}
                      >
                        {isSaved ? "✓" : idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        {item.page && (
                          <p className="text-[11px] text-text-light mb-1">{item.page}</p>
                        )}
                        <p className="text-sm font-semibold text-text-main leading-[1.5] line-clamp-3">
                          {item.point}
                        </p>
                        <p className="text-xs text-text-secondary leading-5 mt-1.5 line-clamp-2">
                          → {item.action}
                        </p>
                      </div>
                    </div>
                  </div>
                  {/* 저장 버튼 */}
                  <div className="px-4 pb-4" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleQuickSave(item); }}
                      disabled={isSaved}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold border transition-all ${
                        isSaved
                          ? "border-success bg-success-light text-success"
                          : "border-primary text-primary bg-primary-light hover:bg-orange-100"
                      }`}
                    >
                      {isSaved ? "✓ 보관 완료" : "+ 내 저장고에 보관하기"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {modalItem && (
          <ActionDetailModal
            item={modalItem}
            log={modalLog}
            logMode={false}
            isSaved={savedIds.has(modalItem.id)}
            onSaved={(id) => setSavedIds((prev) => new Set([...prev, id]))}
            onClose={() => { setModalItem(null); setModalLog(null); }}
          />
        )}

        <Toast message={toastMsg} visible={toastVisible} />
      </main>
    );
  }

  // ── 홈 화면 ───────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-bg">
      <div className="max-w-app mx-auto">

        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 pt-6 pb-4">
          <div>
            <h1 className="text-xl font-bold text-text-main tracking-tight">
              책즙기 🍹
            </h1>
            <p className="text-xs text-text-muted mt-0.5">
              책 속 인사이트를 진하게 착즙해 드려요
            </p>
          </div>
          <Link
            href="/my-life"
            className="bg-primary text-white text-xs font-bold px-4 py-2.5 rounded-xl whitespace-nowrap shadow-sm2"
          >
            내 책즙 저장고 →
          </Link>
        </div>

        {/* 이번 달 착즙량 게이지 */}
        <div className="mx-5 mb-5 bg-white rounded-xl px-4 py-3 shadow-sm2 border border-gray-50 flex items-center gap-3">
          <p className="text-xs text-text-muted whitespace-nowrap">이번 달 착즙량</p>
          <div className="flex-1 bg-gray-100 h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-700"
              style={{ width: `${Math.min((juiceCount / JUICE_GOAL) * 100, 100)}%` }}
            />
          </div>
          <span className="text-xs font-bold text-primary whitespace-nowrap">
            {juiceCount} / {JUICE_GOAL}
          </span>
        </div>

        {/* 에러 메시지 */}
        {generationError && (
          <div className="mx-5 mb-4 bg-white border border-orange-100 rounded-2xl p-4 shadow-sm2">
            <p className="text-sm font-bold text-text-main mb-1.5">⚠️ 착즙 실패</p>
            <p className="text-xs text-text-secondary whitespace-pre-line mb-3 leading-5">
              {generationError}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => errorBook && startGenerating(errorBook)}
                className="flex-1 py-2.5 bg-primary text-white text-sm font-bold rounded-xl"
              >
                다시 착즙
              </button>
              <button
                onClick={() => { setGenerationError(null); setErrorBook(null); }}
                className="px-4 py-2.5 border border-border text-sm text-text-muted rounded-xl"
              >
                닫기
              </button>
            </div>
          </div>
        )}

        {/* 검색 바 */}
        <div className="mx-5 mb-5 relative z-10">
          <div className="flex items-center bg-white rounded-2xl shadow-sm2 border border-gray-100 h-14 pl-4 pr-2 gap-2">
            <svg className="w-4 h-4 text-text-light flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" strokeWidth="2" />
              <path d="M21 21l-4.35-4.35" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchText.trim()) {
                  setShowDropdown(false);
                  const target =
                    suggestions[0] ?? { title: searchText.trim(), author: "" };
                  startGenerating(target);
                }
              }}
              onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              placeholder="착즙할 책 제목을 입력해 주세요"
              className="flex-1 text-sm text-text-main bg-transparent placeholder-text-light"
            />
            {autocompleteLoading && (
              <svg className="animate-spin h-4 w-4 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            )}
            <button
              onClick={() => {
                if (!searchText.trim()) return;
                setShowDropdown(false);
                const target =
                  suggestions[0] ?? { title: searchText.trim(), author: "" };
                startGenerating(target);
              }}
              className="bg-primary text-white text-xs font-bold px-4 py-2.5 rounded-xl whitespace-nowrap"
            >
              착즙하기
            </button>
          </div>

          {/* 자동완성 드롭다운 */}
          {showDropdown && suggestions.length > 0 && (
            <div className="absolute top-[60px] left-0 right-0 bg-white rounded-2xl shadow-dropdown border border-gray-100 overflow-hidden">
              {suggestions.map((book, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setSearchText(book.title);
                    setShowDropdown(false);
                    startGenerating(book);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                    i < suggestions.length - 1 ? "border-b border-gray-50" : ""
                  }`}
                >
                  {book.thumbnail ? (
                    <Image
                      src={book.thumbnail}
                      alt={book.title}
                      width={36}
                      height={48}
                      className="rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-12 rounded-lg bg-primary-light flex items-center justify-center text-sm flex-shrink-0">
                      📚
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-main truncate">
                      {book.title}
                    </p>
                    {book.author && (
                      <p className="text-xs text-text-muted mt-0.5">{book.author}</p>
                    )}
                  </div>
                  <span className="text-text-light text-lg">›</span>
                </button>
              ))}
            </div>
          )}

          {/* 직접 생성 유도 */}
          {searchFired &&
            !autocompleteLoading &&
            searchText.trim().length >= 2 &&
            suggestions.length === 0 &&
            !showDropdown && (
              <div className="absolute top-[60px] left-0 right-0 bg-white rounded-2xl shadow-dropdown border border-gray-100 overflow-hidden">
                <button
                  onClick={() => startGenerating({ title: searchText.trim(), author: "" })}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-9 h-12 rounded-lg bg-primary-light flex items-center justify-center text-sm flex-shrink-0">
                    ⚡
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-semibold text-text-main">
                      &ldquo;{searchText.trim()}&rdquo;에서 바로 즙 짜내기
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">
                      검색 결과 없음 — 직접 착즙하기
                    </p>
                  </div>
                </button>
              </div>
            )}
        </div>

        {/* 카테고리 탭 */}
        <div className="mb-4">
          <p className="text-[11px] font-bold text-text-light uppercase tracking-widest ml-5 mb-3">
            카테고리로 탐색하기
          </p>
          <div className="flex gap-2 overflow-x-auto no-scrollbar px-5 pb-1">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat;
              const color = getCategoryColor(cat);
              const icon = CATEGORY_ICONS[cat] ?? "";
              return (
                <button
                  key={cat}
                  onClick={() => handleCategoryTap(cat)}
                  className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl border text-xs font-bold transition-all"
                  style={{
                    borderColor: isActive ? color : "#e8e8e8",
                    background: isActive ? color : "#ffffff",
                    color: isActive ? "#fff" : "#555555",
                    boxShadow: isActive ? `0 2px 8px ${color}40` : "0 1px 4px rgba(0,0,0,0.05)",
                  }}
                >
                  <span>{icon}</span>
                  <span>{cat}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 본문 영역 */}
        {categoryLoading ? (
          <div className="flex flex-col items-center justify-center pt-14 gap-4">
            <span className="text-4xl animate-spin">🍋</span>
            <p className="text-sm text-text-muted">
              {selectedCategory} 도서를 수확하는 중...
            </p>
          </div>
        ) : books.length > 0 ? (
          <div className="pb-12">
            <p className="text-xs text-text-muted mx-5 mt-2 mb-3">
              {bookListTitle} {books.length}권 — 탭하면 바로 착즙 시작!
            </p>
            <div className="px-5 space-y-2">
              {books.map((book, idx) => (
                <button
                  key={idx}
                  onClick={() => startGenerating(book)}
                  className="w-full flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm2 border border-gray-50 text-left card-hover"
                >
                  {book.thumbnail ? (
                    <Image
                      src={book.thumbnail}
                      alt={book.title}
                      width={52}
                      height={70}
                      className="rounded-lg object-cover flex-shrink-0 shadow-sm2"
                    />
                  ) : (
                    <div className="w-[52px] h-[70px] rounded-lg bg-primary-light flex items-center justify-center text-xl flex-shrink-0">
                      📚
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-text-main leading-snug line-clamp-2">
                      {book.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <p className="text-xs text-text-secondary">{book.author}</p>
                      {book.source === "curated" ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-green-50 text-green-600">
                          AI 검증
                        </span>
                      ) : book.source === "naver" ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-orange-50 text-orange-600">
                          베스트·신간
                        </span>
                      ) : null}
                    </div>
                    {book.description && (
                      <p className="text-xs text-text-muted mt-1.5 leading-4 line-clamp-2">
                        {book.description}
                      </p>
                    )}
                  </div>
                  <span className="text-text-light text-xl flex-shrink-0">›</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex justify-center items-center px-5 pt-8 pb-12">
            <div className="w-full bg-white rounded-3xl p-8 shadow-card border border-gray-50 flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 bg-primary-light rounded-2xl flex items-center justify-center text-3xl">
                🍹
              </div>
              <div>
                <h2 className="text-base font-bold text-text-main leading-snug">
                  두꺼운 책 대신,<br />고농축으로 바로 흡수될 에센스를 추출해 드려요
                </h2>
              </div>
              <div className="w-full bg-bg rounded-xl p-4 space-y-2.5 text-left">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-primary-light rounded-full flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">1</span>
                  <p className="text-sm text-text-secondary">읽은 책 또는 읽고 싶은 책 선택</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-primary-light rounded-full flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">2</span>
                  <p className="text-sm text-text-secondary">AI가 핵심 인사이트를 착즙</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-primary-light rounded-full flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">3</span>
                  <p className="text-sm text-text-secondary">15가지 실천 플랜을 일상에 흡수</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Toast message={toastMsg} visible={toastVisible} />
    </main>
  );
}
