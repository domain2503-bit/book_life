"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getActionItems, getLogs, upsertLog, deleteLog } from "@/lib/api";
import { getCategoryColor } from "@/lib/theme";
import { CATEGORIES, type ActionItem, type UserLog } from "@/lib/types";
import ActionDetailModal from "@/components/ActionDetailModal";
import Toast from "@/components/Toast";

const ALL_CATS = ["전체", ...CATEGORIES] as const;

const EMPTY_MSG: Record<string, { icon: string; title: string; sub: string }> = {
  전체: {
    icon: "🧃",
    title: "저장고가 비어 있습니다",
    sub: "홈에서 책을 착즙하고\n첫 번째 즙을 담아보세요",
  },
  경제경영: {
    icon: "💰",
    title: "경제·경영 즙이 없습니다",
    sub: "투자·경영·비즈니스 관련 책을 착즙해서\n핵심 에센스를 담아보세요",
  },
  자기계발: {
    icon: "🚀",
    title: "자기계발 즙이 없습니다",
    sub: "자기계발 책을 착즙해서\n나만의 성장 플랜을 만들어보세요",
  },
  인문: {
    icon: "🏛️",
    title: "인문 즙이 없습니다",
    sub: "철학·역사·사회 관련 책을 착즙해서\n깊은 통찰을 담아보세요",
  },
  유아: {
    icon: "👶",
    title: "유아·육아 즙이 없습니다",
    sub: "육아·교육 관련 책을 착즙해서\n실천 아이템을 담아보세요",
  },
  건강: {
    icon: "🌿",
    title: "건강 즙이 없습니다",
    sub: "건강·운동 관련 책을 착즙해서\n더 건강한 습관을 만들어보세요",
  },
  산업트렌드: {
    icon: "🔭",
    title: "산업·트렌드 즙이 없습니다",
    sub: "AI·미래기술·트렌드 관련 책을 착즙해서\n앞서가는 인사이트를 담아보세요",
  },
};

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const nDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((nDate.getTime() - dDate.getTime()) / 86400000);
  if (diff === 0) return "오늘";
  if (diff === 1) return "어제";
  if (diff < 7) return `${diff}일 전`;
  if (diff < 30) return `${Math.floor(diff / 7)}주 전`;
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default function MyLifePage() {
  const [selectedCat, setSelectedCat] = useState<string>("전체");
  const [items, setItems] = useState<ActionItem[]>([]);
  const [logs, setLogs] = useState<Record<string, UserLog>>({});
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  const [modalItem, setModalItem] = useState<ActionItem | null>(null);
  const [modalLog, setModalLog] = useState<UserLog | null>(null);

  const [toastMsg, setToastMsg] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(msg: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMsg(msg);
    setToastVisible(true);
    toastTimer.current = setTimeout(() => setToastVisible(false), 2500);
  }

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const cat = selectedCat === "전체" ? undefined : selectedCat;
      const [itemsRes, logsRes] = await Promise.all([
        getActionItems(cat),
        getLogs(),
      ]);
      const logMap: Record<string, UserLog> = {};
      for (const log of logsRes.logs ?? []) {
        logMap[log.action_item_id] = log;
      }
      const all = (itemsRes.action_items ?? []).filter(
        (i: ActionItem) => logMap[i.id]
      );
      setItems(all);
      setLogs(logMap);
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, [selectedCat]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (item: ActionItem) => {
    if (!confirm("이 인사이트를 저장고에서 완전히 비울까요?")) return;
    try {
      await deleteLog(item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setLogs((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
    } catch {
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  const handleToggleDone = async (item: ActionItem) => {
    const cur = logs[item.id];
    const next = cur?.status === "done" ? "pending" : "done";
    try {
      await upsertLog(item.id, next, cur?.note ?? "");
      setLogs((prev) => ({
        ...prev,
        [item.id]: { ...prev[item.id], status: next } as UserLog,
      }));
      showToast(next === "done" ? "🎉 흡수 완료!" : "다시 실천 예정으로 변경했습니다");
    } catch {
      alert("업데이트 중 오류가 발생했습니다.");
    }
  };

  const openModal = async (item: ActionItem) => {
    setModalLog(logs[item.id] ?? null);
    setModalItem(item);
  };

  const doneCount = items.filter((i) => logs[i.id]?.status === "done").length;
  const absorbRate = items.length > 0 ? Math.round((doneCount / items.length) * 100) : 0;
  const emptyInfo = EMPTY_MSG[selectedCat] ?? EMPTY_MSG["전체"];

  return (
    <main className="min-h-screen bg-bg">
      <div className="max-w-app mx-auto">
        {/* 헤더 */}
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <Link
              href="/"
              className="border border-border text-text-muted text-xs font-semibold px-3 py-1.5 rounded-xl whitespace-nowrap hover:bg-gray-50 transition-colors"
            >
              ← 홈
            </Link>
            <h1 className="text-xl font-bold text-text-main">
              내 책즙 저장고 🧃
            </h1>
          </div>

          {/* 통계 카드 */}
          {items.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm2 border border-gray-50 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-lg font-bold text-text-main">{items.length}</p>
                    <p className="text-[10px] text-text-muted mt-0.5">보관 중인 인사이트</p>
                  </div>
                  <div className="w-px h-8 bg-border" />
                  <div className="text-center">
                    <p className="text-lg font-bold text-success">{doneCount}</p>
                    <p className="text-[10px] text-text-muted mt-0.5">실천 완료</p>
                  </div>
                  <div className="w-px h-8 bg-border" />
                  <div className="text-center">
                    <p className="text-lg font-bold text-primary">{absorbRate}%</p>
                    <p className="text-[10px] text-text-muted mt-0.5">지식 흡수율</p>
                  </div>
                </div>
              </div>
              {/* 진행률 바 */}
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-success rounded-full transition-all duration-500"
                  style={{ width: `${absorbRate}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* 카테고리 탭 */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar px-5 pb-4">
          {ALL_CATS.map((cat) => {
            const isActive = selectedCat === cat;
            const color = cat === "전체" ? "#ff7a00" : getCategoryColor(cat);
            return (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                className="flex-shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border"
                style={{
                  borderColor: isActive ? color : "#e8e8e8",
                  background: isActive ? color : "#ffffff",
                  color: isActive ? "#fff" : "#888",
                  boxShadow: isActive ? `0 2px 8px ${color}40` : "0 1px 4px rgba(0,0,0,0.05)",
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* 본문 */}
        {loading ? (
          <div className="px-5 space-y-2 pt-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-full h-28 bg-white rounded-2xl animate-pulse shadow-sm2"
              />
            ))}
          </div>
        ) : fetchError ? (
          <div className="flex justify-center px-5 pt-8">
            <div className="w-full bg-white rounded-3xl p-8 shadow-card border border-gray-50 flex flex-col items-center gap-4">
              <span className="text-4xl">⚠️</span>
              <p className="text-base font-bold text-text-main">
                데이터를 불러오지 못했습니다
              </p>
              <p className="text-sm text-text-muted text-center leading-5">
                네트워크 연결을 확인하고 다시 시도해 주세요
              </p>
              <button
                onClick={fetchData}
                className="mt-1 px-6 py-2.5 bg-primary text-white text-sm font-bold rounded-xl"
              >
                다시 시도
              </button>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex justify-center px-5 pt-8 pb-12">
            <div className="w-full bg-white rounded-3xl p-8 shadow-card border border-gray-50 flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 bg-primary-light rounded-2xl flex items-center justify-center text-3xl">
                {emptyInfo.icon}
              </div>
              <div>
                <p className="text-base font-bold text-text-main">
                  {emptyInfo.title}
                </p>
                <p className="text-sm text-text-muted mt-2 whitespace-pre-line leading-5">
                  {emptyInfo.sub}
                </p>
              </div>
              <Link
                href="/"
                className="px-6 py-2.5 bg-primary text-white text-sm font-bold rounded-xl"
              >
                새로운 책 착즙하러 가기 →
              </Link>
            </div>
          </div>
        ) : (
          <div className="px-5 pb-12 space-y-2">
            {items.map((item) => {
              const c = getCategoryColor(item.category);
              const log = logs[item.id];
              const isDone = log?.status === "done";
              return (
                <div
                  key={item.id}
                  className={`rounded-2xl overflow-hidden shadow-sm2 border ${
                    isDone ? "bg-[#f4fdf6] border-green-100" : "bg-white border-gray-50"
                  }`}
                >
                  {/* 카드 메인 */}
                  <button
                    className="w-full text-left p-4"
                    onClick={() => openModal(item)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="text-[11px] font-bold px-2 py-0.5 rounded-md"
                        style={{ background: c + "20", color: c }}
                      >
                        {item.category}
                        {item.book_title ? ` · ${item.book_title}` : ""}
                      </span>
                      {log?.created_at && (
                        <span className="text-[11px] text-text-light">
                          {formatDate(log.created_at)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-start gap-2">
                      {isDone && (
                        <span className="text-success font-bold text-sm mt-0.5 flex-shrink-0">✓</span>
                      )}
                      <p
                        className={`text-sm font-semibold leading-[1.5] line-clamp-3 ${
                          isDone ? "text-text-muted line-through" : "text-text-main"
                        }`}
                      >
                        {item.point}
                      </p>
                    </div>
                    {log?.note ? (
                      <div className="flex items-center gap-1.5 mt-2.5 bg-gray-50 rounded-lg px-3 py-2">
                        <span className="text-xs">📝</span>
                        <p className="text-xs text-text-secondary truncate">{log.note}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-text-light mt-2.5">
                        탭해서 나만의 실천 계획 메모하기 📝
                      </p>
                    )}
                  </button>

                  {/* 액션 버튼 */}
                  <div className="flex border-t border-gray-100">
                    <button
                      onClick={() => handleToggleDone(item)}
                      className={`flex-[3] py-3 text-xs font-bold transition-all ${
                        isDone
                          ? "bg-success-light text-success"
                          : "text-text-secondary hover:bg-gray-50"
                      }`}
                    >
                      {isDone ? "✔️  흡수 완료!" : "○  일상에 흡수하기"}
                    </button>
                    <div className="w-px bg-gray-100" />
                    <button
                      onClick={() => handleDelete(item)}
                      className="flex-[2] py-3 text-xs font-semibold text-danger bg-[#fff8f8] hover:bg-[#fff0f0] transition-colors"
                    >
                      🗑  비우기
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modalItem && (
        <ActionDetailModal
          item={modalItem}
          log={modalLog}
          logMode={true}
          onClose={() => {
            setModalItem(null);
            setModalLog(null);
            fetchData();
          }}
        />
      )}

      <Toast message={toastMsg} visible={toastVisible} />
    </main>
  );
}
