"use client";

import { useEffect, useRef, useState } from "react";
import { getCategoryColor } from "@/lib/theme";
import { upsertLog } from "@/lib/api";
import type { ActionItem, UserLog } from "@/lib/types";
import Toast from "./Toast";

interface Props {
  item: ActionItem;
  log?: UserLog | null;
  logMode?: boolean;
  onClose: () => void;
  onSaved?: (id: string) => void;
  isSaved?: boolean;
}

function Paragraphs({ text, className }: { text: string; className?: string }) {
  const paragraphs = text
    .split(/\n\n+/)
    .map((p) => p.replace(/\n/g, " ").trim())
    .filter(Boolean);

  return (
    <div className="space-y-4">
      {paragraphs.map((p, i) => (
        <p key={i} className={className}>
          {p}
        </p>
      ))}
    </div>
  );
}

export default function ActionDetailModal({
  item,
  log: initialLog,
  logMode = false,
  onClose,
  onSaved,
  isSaved = false,
}: Props) {
  const [note, setNote] = useState(initialLog?.note ?? "");
  const [isDone, setIsDone] = useState(initialLog?.status === "done");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(isSaved);
  const [toastMsg, setToastMsg] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const color = getCategoryColor(item.category);

  useEffect(() => {
    document.body.classList.add("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, []);

  function showToast(msg: string) {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToastMsg(msg);
    setToastVisible(true);
    timerRef.current = setTimeout(() => setToastVisible(false), 2500);
  }

  async function handleSaveToMyLife() {
    if (saved) return;
    try {
      await upsertLog(item.id, "pending");
      setSaved(true);
      onSaved?.(item.id);
      showToast("🍹 내 책즙 저장고에 안전하게 보관했어요.");
    } catch {
      alert("저장 중 오류가 발생했습니다.");
    }
  }

  async function handleSaveLog() {
    setSaving(true);
    try {
      await upsertLog(item.id, isDone ? "done" : "pending", note);
      showToast("✓ 실천 계획이 저장되었습니다");
    } catch {
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleDone() {
    const next = !isDone;
    setIsDone(next);
    setSaving(true);
    try {
      await upsertLog(item.id, next ? "done" : "pending", note);
      showToast(next ? "🎉 흡수 완료!" : "다시 실천 예정으로 변경했습니다");
    } catch {
      setIsDone(!next);
      alert("업데이트 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col" onClick={onClose}>
      {/* 배경 오버레이 */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />

      {/* 모달 패널 */}
      <div
        className="relative mt-auto bg-white rounded-t-3xl max-h-[92vh] flex flex-col shadow-md2"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 드래그 핸들 */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* 헤더 */}
        <div className="flex items-center px-5 py-3 border-b border-gray-100">
          <button
            onClick={onClose}
            className="text-sm font-semibold text-text-muted mr-3 hover:text-text-secondary transition-colors"
          >
            ← 닫기
          </button>
          <div className="flex items-center gap-2 flex-1">
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-lg"
              style={{ background: color + "20", color }}
            >
              {item.category}
            </span>
            {item.page && (
              <span className="text-xs text-text-light">{item.page}</span>
            )}
          </div>
        </div>

        {/* 본문 스크롤 */}
        <div className="overflow-y-auto flex-1 pb-10">

          {/* 핵심 인사이트 */}
          <div className="px-5 py-5">
            <p className="text-[11px] font-bold text-text-light uppercase tracking-widest mb-3">
              핵심 인사이트
            </p>
            <Paragraphs
              text={item.point}
              className="text-base font-semibold text-text-main leading-relaxed"
            />
          </div>

          {/* 오늘 바로 실천하기 */}
          <div
            className="mx-5 mb-2 bg-primary-light rounded-2xl p-4 border-l-4"
            style={{ borderLeftColor: color }}
          >
            <p className="text-[10px] font-bold text-text-light uppercase tracking-widest mb-2">
              오늘 바로 실천하기
            </p>
            <p className="text-sm text-text-main leading-6 font-medium">
              {item.action}
            </p>
          </div>

          {/* 책 속 맥락 */}
          <div className="px-5 py-4">
            <p className="text-[11px] font-bold text-text-light uppercase tracking-widest mb-3">
              책 속 맥락
            </p>
            <div className="bg-gray-50 rounded-2xl p-4">
              <Paragraphs
                text={item.example}
                className="text-sm text-text-secondary leading-relaxed"
              />
            </div>
          </div>

          <div className="h-px bg-gray-100 mx-5 my-1" />

          {/* 보관 버튼 (홈에서 열 때) */}
          {!logMode && (
            <div className="px-5 py-4">
              <button
                onClick={handleSaveToMyLife}
                disabled={saved}
                className={`w-full py-4 rounded-2xl border-2 font-bold text-sm transition-all ${
                  saved
                    ? "border-success bg-success-light text-success"
                    : "border-primary text-primary bg-primary-light hover:bg-orange-100"
                }`}
              >
                {saved ? "✓ 보관 완료" : "+ 내 저장고에 보관하기"}
              </button>
            </div>
          )}

          {/* 실천 계획 (My Life에서 열 때) */}
          {logMode && (
            <div className="px-5 py-4 space-y-3">
              <p className="text-[11px] font-bold text-text-light uppercase tracking-widest">
                나의 실천 계획
              </p>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={"이 인사이트를 어떻게 실천할 계획인가요?\n구체적인 시간, 장소, 방법을 적어보세요."}
                rows={4}
                className="w-full bg-gray-50 rounded-2xl p-4 text-sm text-text-main leading-6 resize-none border border-gray-100"
              />
              <button
                onClick={handleSaveLog}
                disabled={saving}
                className="w-full py-3 rounded-xl border border-border text-sm font-semibold text-text-secondary bg-white hover:bg-gray-50 transition-colors"
              >
                {saving ? "저장 중..." : "계획 저장"}
              </button>
              <button
                onClick={handleToggleDone}
                disabled={saving}
                className={`w-full py-4 rounded-2xl border-2 font-bold text-sm transition-all ${
                  isDone
                    ? "bg-success border-success text-white"
                    : "border-success text-success hover:bg-success-light"
                }`}
              >
                {isDone ? "✓ 흡수 완료!" : "○ 일상에 흡수하기"}
              </button>
            </div>
          )}
        </div>
      </div>

      <Toast message={toastMsg} visible={toastVisible} />
    </div>
  );
}
