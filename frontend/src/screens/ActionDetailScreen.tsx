import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
  Image,
  Linking,
} from "react-native";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { upsertLog, getLogs } from "../api/client";
import * as Haptics from "expo-haptics";
import { ActionItem, UserLog, RootStackParamList } from "../types";
import type { StackScreenProps } from "@react-navigation/stack";
import { COLORS, SHADOWS, getCategoryColor } from "../constants/theme";

// 문단 나눠서 렌더링
function ParagraphText({ text, style }: { text: string; style: any }) {
  const paragraphs = text.split(/\n\n|\n/).filter((p) => p.trim().length > 0);
  return (
    <View style={{ gap: 12 }}>
      {paragraphs.map((p, i) => (
        <Text key={i} style={style}>{p.trim()}</Text>
      ))}
    </View>
  );
}

// 토스트 컴포넌트
function Toast({ message, visible }: { message: string; visible: boolean }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-16)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -16, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Animated.View style={[toastStyles.container, { opacity, transform: [{ translateY }] }]}>
      <Text style={toastStyles.text}>{message}</Text>
    </Animated.View>
  );
}

const toastStyles = StyleSheet.create({
  container: {
    position: "absolute", top: 60, alignSelf: "center",
    backgroundColor: "#1a1a2e", paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 24, zIndex: 999,
  },
  text: { color: "#fff", fontSize: 13, fontWeight: "600" },
});

type Props = StackScreenProps<RootStackParamList, "ActionDetail">;

export default function ActionDetailScreen({ route, navigation }: Props) {
  const {
    item,
    log: initialLog,
    allItems,
    bookTitle,
    bookThumbnail,
    bookCategory,
    bookSummary,
    reviewSources = [],
    newGeneration,
    logMode = false,
  } = route.params;

  const items: ActionItem[] = allItems ?? (item ? [item] : []);
  const [currentItem, setCurrentItem] = useState<ActionItem>(item ?? items[0]);
  const [note, setNote] = useState(initialLog?.note || "");
  const [isDone, setIsDone] = useState(initialLog?.status === "done");
  const [saving, setSaving] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"list" | "detail">(
    newGeneration && items.length > 1 ? "list" : "detail"
  );
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const catColor = getCategoryColor(bookCategory || currentItem?.category);

  useEffect(() => {
    if (!items?.length) return;
    (async () => {
      try {
        const res = await getLogs();
        const ids = new Set<string>((res.data.logs || []).map((l: UserLog) => l.action_item_id));
        setSavedIds(ids);
      } catch {}
    })();
  }, []);

  const showToast = (msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMsg(msg);
    setToastVisible(true);
    toastTimer.current = setTimeout(() => setToastVisible(false), 2000);
  };

  const handleQuickSave = async (ai: ActionItem) => {
    if (savedIds.has(ai.id)) return;
    try {
      await upsertLog(ai.id, "pending");
      setSavedIds((prev) => new Set([...prev, ai.id]));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      showToast("✓ My Life에 담겼습니다");
    } catch {
      Alert.alert("오류", "저장 중 오류가 발생했습니다.");
    }
  };

  const handleSaveToMyLife = async () => {
    if (!currentItem || savedIds.has(currentItem.id)) return;
    try {
      await upsertLog(currentItem.id, "pending");
      setSavedIds((prev) => new Set([...prev, currentItem.id]));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      showToast("✓ My Life에 담겼습니다");
    } catch {
      Alert.alert("오류", "저장 중 오류가 발생했습니다.");
    }
  };

  const handleSaveLog = async () => {
    if (!currentItem) return;
    setSaving(true);
    try {
      await upsertLog(currentItem.id, isDone ? "done" : "pending", note);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast("✓ 실천 계획이 저장되었습니다");
    } catch {
      Alert.alert("오류", "저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const switchView = (mode: "list" | "detail") => {
    LayoutAnimation.configureNext({
      duration: 220,
      create: { type: "easeInEaseOut", property: "opacity" },
      update: { type: "easeInEaseOut" },
    });
    setViewMode(mode);
  };

  const handleSelectItem = async (selected: ActionItem) => {
    setCurrentItem(selected);
    setNote("");
    setIsDone(false);
    try {
      const res = await getLogs(selected.id);
      const existingLog = res.data.logs?.[0];
      if (existingLog) {
        setNote(existingLog.note || "");
        setIsDone(existingLog.status === "done");
      }
    } catch {}
    switchView("detail");
  };

  if (!currentItem) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.emptyText}>데이터가 없습니다.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const savedCount = items
    ? items.filter((ai: ActionItem) => savedIds.has(ai.id)).length
    : 0;

  // ── 목록 뷰 ──────────────────────────────────────────────────────────────
  if (viewMode === "list" && items?.length > 0) {
    return (
      <SafeAreaView style={styles.container}>
        {/* 커스텀 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>← 뒤로</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>{bookTitle}</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.saveCountBadge}>
              <Text style={styles.saveCountText}>{savedCount}/{items.length}</Text>
            </View>
            <TouchableOpacity style={styles.myLifeIconBtn} onPress={() => navigation.navigate("MyLife")}>
              <Text style={styles.myLifeIconText}>♥</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {/* 책 정보 카드 */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryInner}>
              {bookThumbnail ? (
                <Image source={{ uri: bookThumbnail }} style={styles.summaryThumb} />
              ) : (
                <View style={styles.summaryThumbEmpty}>
                  <Text style={{ fontSize: 22 }}>📚</Text>
                </View>
              )}
              <View style={styles.summaryRight}>
                <View style={[styles.catBadge, { backgroundColor: catColor + "22" }]}>
                  <Text style={[styles.catBadgeText, { color: catColor }]}>{bookCategory}</Text>
                </View>
                <Text style={styles.summaryTitle} numberOfLines={2}>{bookTitle}</Text>
                <Text style={styles.summaryCount}>핵심 인사이트 {items.length}개</Text>
              </View>
            </View>
            {bookSummary ? (
              <TouchableOpacity onPress={() => setSummaryExpanded((v) => !v)} activeOpacity={0.85}>
                <Text style={styles.summaryText} numberOfLines={summaryExpanded ? undefined : 3}>
                  {bookSummary}
                </Text>
                <Text style={styles.summaryToggle}>
                  {summaryExpanded ? "▲ 접기" : "▼ 더보기"}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* 참고 서평 */}
          {reviewSources.length > 0 && (
            <View style={styles.sourcesCard}>
              <Text style={styles.sourcesLabel}>📎 참고한 서평 {reviewSources.length}개</Text>
              {reviewSources.slice(0, 5).map((source: { title?: string; url: string } | string, i: number) => {
                const url = typeof source === "string" ? source : source.url;
                const title = typeof source === "string" ? "" : (source.title || "");
                return (
                  <TouchableOpacity key={i} style={styles.sourceRow} onPress={() => Linking.openURL(url)}>
                    <Text style={styles.sourceIndex}>{i + 1}</Text>
                    <View style={{ flex: 1 }}>
                      {title ? (
                        <Text style={styles.sourceTitle} numberOfLines={1}>{title}</Text>
                      ) : null}
                      <Text style={styles.sourceUrl} numberOfLines={1}>{url}</Text>
                    </View>
                    <Text style={styles.sourceArrow}>›</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* 아이템 목록 */}
          {items.map((ai: ActionItem, idx: number) => {
            const c = getCategoryColor(ai.category);
            const isSaved = savedIds.has(ai.id);
            return (
              <TouchableOpacity
                key={ai.id}
                style={styles.listCard}
                onPress={() => handleSelectItem(ai)}
                activeOpacity={0.85}
              >
                <View style={[styles.listBar, { backgroundColor: isSaved ? COLORS.success : c }]} />
                <View style={styles.listContent}>
                  <View style={styles.listTop}>
                    <Text style={styles.listIndex}>{idx + 1}</Text>
                    {ai.page ? <Text style={styles.listPage}>{ai.page}</Text> : null}
                    {isSaved && (
                      <View style={styles.savedBadge}>
                        <Text style={styles.savedBadgeText}>✓ 담김</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.listPoint} numberOfLines={3}>{ai.point}</Text>
                  <Text style={styles.listAction} numberOfLines={2}>→ {ai.action}</Text>
                  <TouchableOpacity
                    style={[
                      styles.saveBtn,
                      isSaved
                        ? styles.saveBtnDone
                        : { borderColor: c, backgroundColor: c + "11" },
                    ]}
                    onPress={() => handleQuickSave(ai)}
                    disabled={isSaved}
                  >
                    <Text style={[
                      styles.saveBtnText,
                      isSaved ? styles.saveBtnTextDone : { color: c },
                    ]}>
                      {isSaved ? "✓ 담김" : "+ My Life에 담기"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Toast message={toastMsg} visible={toastVisible} />
      </SafeAreaView>
    );
  }

  // ── 상세 뷰 ──────────────────────────────────────────────────────────────
  const isSavedCurrent = savedIds.has(currentItem.id);
  const color = getCategoryColor(currentItem.category);
  const currentIndex = items
    ? items.findIndex((ai: ActionItem) => ai.id === currentItem.id)
    : -1;

  return (
    <SafeAreaView style={styles.container}>
      {/* 커스텀 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (logMode || !items?.length) {
              navigation.goBack();
            } else {
              switchView("list");
            }
          }}
        >
          <Text style={styles.backBtnText}>
            {logMode || !items?.length ? "← 뒤로" : "← 목록"}
          </Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={[styles.headerCatBadge, { backgroundColor: color + "22" }]}>
            <Text style={[styles.headerCatText, { color }]}>{currentItem.category}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          {items?.length > 1 && !logMode && (
            <Text style={styles.headerIndexText}>
              {currentIndex + 1}/{items.length}
            </Text>
          )}
          <TouchableOpacity style={styles.myLifeIconBtn} onPress={() => navigation.navigate("MyLife")}>
            <Text style={styles.myLifeIconText}>♥</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* 핵심 인사이트 + 페이지 배지 */}
        <View style={styles.section}>
          <View style={styles.sectionLabelRow}>
            <Text style={styles.sectionLabel}>핵심 인사이트</Text>
            {currentItem.page ? (
              <View style={[styles.pageBadge, { backgroundColor: color + "22" }]}>
                <Text style={[styles.pageBadgeText, { color }]}>{currentItem.page}</Text>
              </View>
            ) : null}
          </View>
          <ParagraphText text={currentItem.point} style={styles.pointText} />
        </View>

        {/* 실천 액션 */}
        <View style={[styles.actionBox, { borderLeftColor: color }]}>
          <Text style={styles.actionBoxLabel}>오늘 바로 실천하기</Text>
          <Text style={styles.actionText}>{currentItem.action}</Text>
        </View>

        {/* 책 속 맥락 */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>책 속 맥락</Text>
          <View style={styles.exampleBox}>
            <ParagraphText text={currentItem.example} style={styles.exampleText} />
          </View>
        </View>

        <View style={styles.divider} />

        {/* logMode=false: 담기 버튼 */}
        {!logMode && (
          <View style={styles.section}>
            <TouchableOpacity
              style={[
                styles.myLifeFullBtn,
                { borderColor: isSavedCurrent ? COLORS.success : COLORS.primary },
                isSavedCurrent && { backgroundColor: COLORS.successLight },
              ]}
              onPress={handleSaveToMyLife}
              disabled={isSavedCurrent}
              accessibilityRole="button"
              accessibilityLabel={isSavedCurrent ? "이미 My Life에 담긴 인사이트" : "My Life에 담기"}
            >
              <Text style={[
                styles.myLifeFullBtnText,
                { color: isSavedCurrent ? COLORS.success : COLORS.primary },
              ]}>
                {isSavedCurrent ? "✓ My Life에 담김" : "+ My Life에 담기"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* logMode=true: 실천 계획 */}
        {logMode && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>나의 실천 계획</Text>
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder={"이 인사이트를 어떻게 실천할 계획인가요?\n구체적인 시간, 장소, 방법을 적어보세요."}
              placeholderTextColor={COLORS.textLight}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={styles.savePlanBtn}
              onPress={handleSaveLog}
              disabled={saving}
            >
              <Text style={styles.savePlanBtnText}>
                {saving ? "저장 중..." : "계획 저장"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {logMode && (
          <View style={[styles.section, { marginTop: 0, marginBottom: 32 }]}>
            <TouchableOpacity
              style={[
                styles.doneBtn,
                isDone && { backgroundColor: COLORS.success, borderColor: COLORS.success },
              ]}
              disabled={saving}
              onPress={async () => {
                const next = !isDone;
                setIsDone(next);
                setSaving(true);
                try {
                  await upsertLog(currentItem.id, next ? "done" : "pending", note);
                  showToast(next ? "🎉 실천 완료!" : "다시 실천 예정으로 변경했습니다");
                } catch {
                  setIsDone(!next);
                  Alert.alert("오류", "업데이트 중 오류가 발생했습니다.");
                } finally {
                  setSaving(false);
                }
              }}
            >
              <Text style={[styles.doneBtnText, isDone && { color: "#fff" }]}>
                {isDone ? "✓  실천 완료!" : "○  실천 완료로 표시하기"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <Toast message={toastMsg} visible={toastVisible} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { fontSize: 16, color: COLORS.textMuted },
  scroll: { paddingBottom: 40 },

  // 헤더
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: {
    paddingVertical: 6, paddingRight: 12, minWidth: 64,
  },
  backBtnText: { fontSize: 14, fontWeight: "700", color: COLORS.primary },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: {
    fontSize: 14, fontWeight: "700", color: COLORS.text, maxWidth: 180,
  },
  headerCatBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
  },
  headerCatText: { fontSize: 12, fontWeight: "700" },
  headerIndexText: {
    fontSize: 12, color: COLORS.textMuted, fontWeight: "600", minWidth: 48, textAlign: "right",
  },
  saveCountBadge: {
    backgroundColor: COLORS.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
  },
  saveCountText: { fontSize: 12, fontWeight: "700", color: COLORS.primary },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  myLifeIconBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.danger + "18",
    justifyContent: "center", alignItems: "center",
  },
  myLifeIconText: { fontSize: 15, color: COLORS.danger },

  // 목록 뷰 - 책 정보 카드 (인사이트 카드와 시각적으로 명확히 구분)
  summaryCard: {
    marginHorizontal: 16, marginTop: 16, marginBottom: 8,
    backgroundColor: "#f0effe",
    borderRadius: 16, padding: 14,
    gap: 10,
    borderWidth: 1, borderColor: "#dddaf8",
  },
  summaryInner: { flexDirection: "row", alignItems: "center", gap: 12 },
  summaryThumb: { width: 54, height: 74, borderRadius: 6 },
  summaryThumbEmpty: {
    width: 54, height: 74, borderRadius: 6,
    backgroundColor: "#e4e2f8", justifyContent: "center", alignItems: "center",
  },
  summaryRight: { flex: 1, gap: 5 },
  catBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: "flex-start" },
  catBadgeText: { fontSize: 11, fontWeight: "700" },
  summaryTitle: { fontSize: 14, fontWeight: "800", color: COLORS.text, lineHeight: 20 },
  summaryText: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
  summaryToggle: { fontSize: 11, color: COLORS.primary, marginTop: 4, fontWeight: "600" },
  summaryCount: { fontSize: 11, color: COLORS.textMuted },

  // 목록 뷰 - 참고 서평
  sourcesCard: {
    marginHorizontal: 16, marginTop: 8, marginBottom: 4,
    backgroundColor: COLORS.card, borderRadius: 14, padding: 14,
    gap: 8, ...SHADOWS.small,
  },
  sourcesLabel: { fontSize: 11, fontWeight: "700", color: COLORS.textMuted, marginBottom: 2 },
  sourceRow: {
    flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  sourceIndex: {
    width: 18, height: 18, borderRadius: 9, backgroundColor: COLORS.primary + "22",
    textAlign: "center", lineHeight: 18, fontSize: 11, fontWeight: "700", color: COLORS.primary,
  },
  sourceTitle: {
    fontSize: 13, fontWeight: "600", color: COLORS.text, lineHeight: 18,
  },
  sourceUrl: {
    fontSize: 10, color: COLORS.textLight, lineHeight: 14,
  },
  sourceArrow: { fontSize: 18, color: COLORS.textLight },

  // 목록 뷰 - 아이템 카드
  listCard: {
    flexDirection: "row", backgroundColor: COLORS.card,
    marginHorizontal: 16, marginVertical: 5, borderRadius: 14, overflow: "hidden",
    ...SHADOWS.small,
  },
  listBar: { width: 4 },
  listContent: { flex: 1, padding: 14, gap: 6 },
  listTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  listIndex: {
    fontSize: 11, fontWeight: "800", color: COLORS.textLight,
    width: 18, textAlign: "center",
  },
  listPage: { fontSize: 11, color: COLORS.textLight, flex: 1 },
  savedBadge: {
    backgroundColor: COLORS.successLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
  },
  savedBadgeText: { fontSize: 10, fontWeight: "700", color: COLORS.success },
  listPoint: { fontSize: 13, fontWeight: "600", color: COLORS.text, lineHeight: 20 },
  listAction: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
  saveBtn: {
    alignSelf: "flex-start", marginTop: 4,
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1.5,
  },
  saveBtnDone: { borderColor: COLORS.textLight, backgroundColor: "#f5f5fa" },
  saveBtnText: { fontSize: 12, fontWeight: "700" },
  saveBtnTextDone: { color: COLORS.textLight },

  // 상세 뷰
  section: { marginHorizontal: 20, marginVertical: 14 },
  sectionLabelRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 11, fontWeight: "700", color: COLORS.textLight,
    textTransform: "uppercase", letterSpacing: 0.8,
  },
  pageBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
  },
  pageBadgeText: { fontSize: 11, fontWeight: "700" },
  pointText: {
    fontSize: 16, fontWeight: "600", color: COLORS.text, lineHeight: 26,
  },
  actionBox: {
    marginHorizontal: 20, marginVertical: 6,
    backgroundColor: COLORS.card, borderRadius: 14, padding: 16,
    borderLeftWidth: 4, ...SHADOWS.small,
  },
  actionBoxLabel: {
    fontSize: 10, fontWeight: "800", color: COLORS.textLight,
    textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8,
  },
  actionText: { fontSize: 15, color: COLORS.text, lineHeight: 24, fontWeight: "500" },

  exampleBox: {
    backgroundColor: COLORS.card, borderRadius: 14, padding: 16, ...SHADOWS.small,
  },
  exampleText: {
    fontSize: 14, color: COLORS.textSecondary, lineHeight: 24,
  },
  divider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 20, marginVertical: 4 },

  myLifeFullBtn: {
    borderRadius: 14, paddingVertical: 16, alignItems: "center",
    borderWidth: 2,
  },
  myLifeFullBtnText: { fontSize: 15, fontWeight: "700" },

  noteInput: {
    backgroundColor: COLORS.card, borderRadius: 14, padding: 16,
    fontSize: 15, color: COLORS.text, lineHeight: 24, minHeight: 120,
    ...SHADOWS.small,
  },
  savePlanBtn: {
    marginTop: 10, borderRadius: 10, paddingVertical: 12,
    alignItems: "center", backgroundColor: "#f0f0f8",
    borderWidth: 1, borderColor: "#ddd",
  },
  savePlanBtnText: { fontSize: 14, fontWeight: "600", color: COLORS.primary },

  doneBtn: {
    borderRadius: 14, paddingVertical: 16, alignItems: "center",
    borderWidth: 2, borderColor: COLORS.success,
    flexDirection: "row", justifyContent: "center",
  },
  doneBtnText: { fontSize: 16, fontWeight: "800", color: COLORS.success },
});
