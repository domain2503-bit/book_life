import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  RefreshControl,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import CategoryTabs from "../components/CategoryTabs";
import SkeletonCard from "../components/SkeletonCard";
import { getActionItems, getLogs, deleteLog, upsertLog } from "../api/client";
import * as Haptics from "expo-haptics";
import { ActionItem, Category, UserLog, RootStackParamList } from "../types";
import type { StackScreenProps } from "@react-navigation/stack";
import { COLORS, SHADOWS, getCategoryColor } from "../constants/theme";

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  // 날짜 경계 기준 (24h 아닌 calendar day 차이)
  const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const nDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((nDate.getTime() - dDate.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "오늘";
  if (diff === 1) return "어제";
  if (diff < 7) return `${diff}일 전`;
  if (diff < 30) return `${Math.floor(diff / 7)}주 전`;
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

// 카테고리별 빈 상태 메시지
const EMPTY_MESSAGES: Record<string, { icon: string; title: string; sub: string }> = {
  "전체": {
    icon: "📚",
    title: "아직 담긴 인사이트가 없습니다",
    sub: "홈에서 책을 검색하고\n인사이트를 담아보세요",
  },
  "투자": {
    icon: "💰",
    title: "투자 인사이트가 없습니다",
    sub: "투자·경제 관련 책을 검색해서\n핵심 인사이트를 담아보세요",
  },
  "육아": {
    icon: "👶",
    title: "육아 인사이트가 없습니다",
    sub: "육아·교육 관련 책을 검색해서\n실천 아이템을 담아보세요",
  },
  "자기계발": {
    icon: "🚀",
    title: "자기계발 인사이트가 없습니다",
    sub: "자기계발 책을 검색해서\n나만의 성장 플랜을 만들어보세요",
  },
  "업무": {
    icon: "💼",
    title: "업무 인사이트가 없습니다",
    sub: "업무·리더십 관련 책을 검색해서\n직장 생활에 적용해보세요",
  },
  "건강": {
    icon: "🌿",
    title: "건강 인사이트가 없습니다",
    sub: "건강·운동 관련 책을 검색해서\n더 건강한 습관을 만들어보세요",
  },
};

type CacheEntry = { items: ActionItem[]; logs: Record<string, UserLog>; ts: number };

type Props = StackScreenProps<RootStackParamList, "MyLife">;

export default function MyLifeScreen({ navigation }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<Category | "전체">("전체");
  const [savedItems, setSavedItems] = useState<ActionItem[]>([]);
  const [logs, setLogs] = useState<Record<string, UserLog>>({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const cache = useRef<Record<string, CacheEntry>>({});
  const CACHE_TTL = 30_000; // 30초

  const fetchData = useCallback(async (force = false) => {
    const key = selectedCategory;
    const hit = cache.current[key];
    if (!force && hit && Date.now() - hit.ts < CACHE_TTL) {
      setSavedItems(hit.items);
      setLogs(hit.logs);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    setLoading(true);
    try {
      const cat = selectedCategory === "전체" ? undefined : selectedCategory;
      const [itemsRes, logsRes] = await Promise.all([
        getActionItems(cat),
        getLogs(),
      ]);
      const logMap: Record<string, UserLog> = {};
      for (const log of logsRes.data.logs || []) {
        logMap[log.action_item_id] = log;
      }
      const all: ActionItem[] = itemsRes.data.action_items || [];
      const filtered = all.filter((item) => logMap[item.id]);
      cache.current[key] = { items: filtered, logs: logMap, ts: Date.now() };
      setSavedItems(filtered);
      setLogs(logMap);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory]);

  useFocusEffect(useCallback(() => { fetchData(true); }, [fetchData]));
  useEffect(() => { fetchData(); }, [selectedCategory]);

  const handleDelete = (item: ActionItem) => {
    Alert.alert(
      "My Life에서 삭제",
      `"${item.point.slice(0, 30)}..." 을 삭제할까요?`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제", style: "destructive",
          onPress: async () => {
            try {
              await deleteLog(item.id);
              cache.current = {};
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              setSavedItems((prev) => prev.filter((i) => i.id !== item.id));
              setLogs((prev) => {
                const next = { ...prev };
                delete next[item.id];
                return next;
              });
            } catch {
              Alert.alert("오류", "삭제 중 오류가 발생했습니다.");
            }
          },
        },
      ]
    );
  };

  const handleToggleDone = async (item: ActionItem) => {
    const current = logs[item.id];
    const newStatus = current?.status === "done" ? "pending" : "done";
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await upsertLog(item.id, newStatus, current?.note || "");
      setLogs((prev) => ({
        ...prev,
        [item.id]: { ...prev[item.id], status: newStatus } as UserLog,
      }));
    } catch {
      Alert.alert("오류", "업데이트 중 오류가 발생했습니다.");
    }
  };

  const doneCount = savedItems.filter((i) => logs[i.id]?.status === "done").length;
  const emptyInfo = EMPTY_MESSAGES[selectedCategory] ?? EMPTY_MESSAGES["전체"];

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← 홈</Text>
        </TouchableOpacity>
        <View style={styles.headerMain}>
          <Text style={styles.title}>My Life</Text>
          {savedItems.length > 0 && (
            <View style={styles.statsRow}>
              <Text style={styles.statsText}>{savedItems.length}개 담음</Text>
              <View style={styles.statsDot} />
              <Text style={[styles.statsText, doneCount > 0 && { color: COLORS.success }]}>
                완료 {doneCount}개
              </Text>
              {savedItems.length > 0 && (
                <>
                  <View style={styles.statsDot} />
                  <Text style={styles.statsText}>
                    {Math.round((doneCount / savedItems.length) * 100)}%
                  </Text>
                </>
              )}
            </View>
          )}
        </View>
      </View>

      {/* 진행률 바 */}
      {savedItems.length > 0 && (
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${(doneCount / savedItems.length) * 100}%` as any },
            ]}
          />
        </View>
      )}

      <CategoryTabs selected={selectedCategory} onSelect={setSelectedCategory} />

      {loading && !refreshing ? (
        <View style={{ paddingTop: 8 }}>
          {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
        </View>
      ) : savedItems.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>{emptyInfo.icon}</Text>
            <Text style={styles.emptyTitle}>{emptyInfo.title}</Text>
            <Text style={styles.emptySub}>{emptyInfo.sub}</Text>
            <TouchableOpacity
              style={styles.goHomeBtn}
              onPress={() => navigation.navigate("Main")}
            >
              <Text style={styles.goHomeBtnText}>인사이트 찾으러 가기 →</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchData(); }}
              tintColor={COLORS.primary}
            />
          }
        >
          {savedItems.map((item) => {
            const c = getCategoryColor(item.category);
            const log = logs[item.id];
            const isDone = log?.status === "done";
            return (
              <View key={item.id} style={[styles.card, isDone && styles.cardDone]}>
                <View style={[styles.cardBar, { backgroundColor: isDone ? COLORS.success : c }]} />
                <View style={styles.cardMain}>
                  <TouchableOpacity
                    style={styles.cardContent}
                    onPress={() =>
                      navigation.navigate("ActionDetail", {
                        item, log: log || null, logMode: true,
                      })
                    }
                    activeOpacity={0.85}
                  >
                    <View style={styles.cardTop}>
                      <View style={[styles.badge, { backgroundColor: c + "22" }]}>
                        <Text style={[styles.badgeText, { color: c }]}>
                          {item.category}{item.book_title ? ` · ${item.book_title}` : ""}
                        </Text>
                      </View>
                      {log?.created_at ? (
                        <Text style={styles.dateText}>{formatDate(log.created_at)}</Text>
                      ) : null}
                    </View>

                    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 6 }}>
                      {isDone && <Text style={styles.doneCheck}>✓</Text>}
                      <Text
                        style={[styles.pointText, isDone && styles.pointTextDone, { flex: 1 }]}
                        numberOfLines={3}
                      >
                        {item.point}
                      </Text>
                    </View>

                    {log?.note ? (
                      <View style={styles.noteRow}>
                        <Text style={styles.noteIcon}>📝</Text>
                        <Text style={styles.notePreview} numberOfLines={1}>{log.note}</Text>
                      </View>
                    ) : (
                      <Text style={styles.noNote}>탭해서 실천 계획 작성 →</Text>
                    )}
                  </TouchableOpacity>

                  {/* 액션 버튼 */}
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={[styles.doneBtn, isDone && styles.doneBtnActive]}
                      onPress={() => handleToggleDone(item)}
                      accessibilityRole="button"
                      accessibilityLabel={isDone ? "완료 취소" : "완료 표시"}
                    >
                      <Text style={[styles.doneBtnText, isDone && styles.doneBtnTextActive]}>
                        {isDone ? "✓  완료됨" : "○  완료 표시"}
                      </Text>
                    </TouchableOpacity>
                    <View style={styles.actionDivider} />
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDelete(item)}
                      accessibilityRole="button"
                      accessibilityLabel="My Life에서 삭제"
                    >
                      <Text style={styles.deleteBtnText}>🗑  삭제</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // 헤더
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10, gap: 12,
  },
  backBtn: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.primary,
  },
  backBtnText: { color: COLORS.primary, fontWeight: "700", fontSize: 13 },
  headerMain: { flex: 1 },
  title: { fontSize: 26, fontWeight: "800", color: COLORS.text },
  statsRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  statsText: { fontSize: 12, color: COLORS.textMuted, fontWeight: "500" },
  statsDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: COLORS.textLight },

  // 진행률 바
  progressBarBg: {
    height: 3, backgroundColor: COLORS.border, marginHorizontal: 20, borderRadius: 2,
  },
  progressBarFill: {
    height: 3, backgroundColor: COLORS.success, borderRadius: 2,
  },

  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },

  // 빈 상태
  emptyCard: {
    backgroundColor: COLORS.card, borderRadius: 20, padding: 32,
    alignItems: "center", width: "100%", gap: 10, ...SHADOWS.small,
  },
  emptyIcon: { fontSize: 44, marginBottom: 4 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: COLORS.text, textAlign: "center" },
  emptySub: {
    fontSize: 13, color: COLORS.textMuted, textAlign: "center", lineHeight: 20,
  },
  goHomeBtn: {
    marginTop: 8, paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 20, backgroundColor: COLORS.primary,
  },
  goHomeBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  // 카드
  card: {
    flexDirection: "row", backgroundColor: COLORS.card,
    marginHorizontal: 16, marginVertical: 5, borderRadius: 16, overflow: "hidden",
    ...SHADOWS.small,
  },
  cardDone: { backgroundColor: "#f0faf8" },
  cardBar: { width: 4 },
  cardMain: { flex: 1 },
  cardContent: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10, gap: 6 },
  cardTop: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", gap: 6,
  },
  dateText: { fontSize: 11, color: COLORS.textLight },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  pointText: {
    fontSize: 14, fontWeight: "600", color: COLORS.text, lineHeight: 21,
  },
  pointTextDone: { color: COLORS.textMuted, textDecorationLine: "line-through" },
  doneCheck: { fontSize: 14, color: COLORS.success, fontWeight: "800", lineHeight: 21 },
  noteRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  noteIcon: { fontSize: 12 },
  notePreview: { fontSize: 12, color: COLORS.textSecondary, flex: 1 },
  noNote: { fontSize: 12, color: COLORS.textLight },

  cardActions: {
    flexDirection: "row", borderTopWidth: 1, borderTopColor: COLORS.border, minHeight: 46,
  },
  actionDivider: { width: 1, backgroundColor: COLORS.border },
  doneBtn: {
    flex: 3, paddingVertical: 12, alignItems: "center", justifyContent: "center",
  },
  doneBtnActive: { backgroundColor: COLORS.successLight },
  doneBtnText: { fontSize: 13, fontWeight: "700", color: COLORS.textLight },
  doneBtnTextActive: { color: COLORS.success },
  deleteBtn: {
    flex: 2, paddingVertical: 12, alignItems: "center", justifyContent: "center",
    backgroundColor: "#fff8f8",
  },
  deleteBtnText: { fontSize: 13, fontWeight: "600", color: COLORS.danger },
});
