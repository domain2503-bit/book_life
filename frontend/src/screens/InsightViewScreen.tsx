import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  TextInput,
  ScrollView,
  Keyboard,
  Animated,
} from "react-native";
import { searchBooks, recommendBooks, generateActions, getActionItems } from "../api/client";
import { Book, Category, CATEGORIES, RootStackParamList } from "../types";
import type { StackScreenProps } from "@react-navigation/stack";
import { COLORS, SHADOWS, getCategoryColor } from "../constants/theme";
import JuicerMachine from "../components/JuicerMachine";
import JuiceBar from "../components/JuiceBar";

const EXTRACTION_MSGS = [
  { emoji: "📚", label: "책을 즙기에 넣는 중...", sub: "네이버 서평을 수집하고 있어요" },
  { emoji: "🔩", label: "착즙 시작!", sub: "책 내용을 분석하고 있어요" },
  { emoji: "💚", label: "핵심 영양소 추출 중", sub: "AI가 핵심 메시지를 짜내고 있어요" },
  { emoji: "🍹", label: "책즙 농축 중", sub: "실천 가능한 15개 액션으로 완성 중..." },
];

type Props = StackScreenProps<RootStackParamList, "Main">;

export default function InsightViewScreen({ navigation }: Props) {
  const [searchText, setSearchText] = useState("");
  const [suggestions, setSuggestions] = useState<Book[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [books, setBooks] = useState<Book[]>([]);
  const [bookListTitle, setBookListTitle] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [autocompleteLoading, setAutocompleteLoading] = useState(false);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [longWait, setLongWait] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [errorBook, setErrorBook] = useState<Book | null>(null);
  const [doneCount, setDoneCount] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 착즙 로딩 애니메이션
  const juiceFill = useRef(new Animated.Value(0)).current;
  const bladeRotate = useRef(new Animated.Value(0)).current;
  const msgOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    getActionItems().then((res) => {
      const items = res.data || [];
      const done = items.filter((it: any) => it.status === "done").length;
      setDoneCount(done);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchText.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setAutocompleteLoading(true);
      try {
        const res = await searchBooks(searchText.trim());
        const list: Book[] = res.data.books || [];
        setSuggestions(list);
        setShowSuggestions(list.length > 0);
      } catch {
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setAutocompleteLoading(false);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchText]);

  useEffect(() => {
    if (!generating) {
      setCurrentStep(0);
      setLongWait(false);
      juiceFill.setValue(0);
      bladeRotate.setValue(0);
      return;
    }
    setCurrentStep(0);
    setLongWait(false);

    // 블레이드 회전
    Animated.loop(
      Animated.timing(bladeRotate, { toValue: 1, duration: 700, useNativeDriver: true })
    ).start();

    // 주스 채우기 (단계별)
    const delays = [8000, 20000, 35000];
    const stepTimers = delays.map((d, i) =>
      setTimeout(() => {
        setCurrentStep(i + 1);
        Animated.timing(juiceFill, {
          toValue: (i + 2) / EXTRACTION_MSGS.length,
          duration: 600,
          useNativeDriver: false,
        }).start();
      }, d)
    );
    // 초기 채움
    Animated.timing(juiceFill, {
      toValue: 1 / EXTRACTION_MSGS.length,
      duration: 600,
      useNativeDriver: false,
    }).start();

    const longWaitTimer = setTimeout(() => setLongWait(true), 60000);
    return () => {
      stepTimers.forEach(clearTimeout);
      clearTimeout(longWaitTimer);
    };
  }, [generating]);

  const spin = bladeRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const juiceHeight = juiceFill.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const handleSearch = async () => {
    if (!searchText.trim()) return;
    Keyboard.dismiss();
    setShowSuggestions(false);
    const target = suggestions[0] ?? { title: searchText.trim(), author: "" };
    await startGenerating(target);
  };

  const handleSelectSuggestion = async (book: Book) => {
    Keyboard.dismiss();
    setShowSuggestions(false);
    setSearchText(book.title);
    await startGenerating(book);
  };

  const handleCategoryTap = async (cat: Category) => {
    if (selectedCategory === cat) {
      setSelectedCategory(null);
      setBooks([]);
      return;
    }
    setSelectedCategory(cat);
    setShowSuggestions(false);
    Keyboard.dismiss();
    setCategoryLoading(true);
    try {
      const res = await recommendBooks(cat);
      setBooks(res.data.books || []);
      setBookListTitle(`${cat} 추천 도서`);
    } catch {
      Alert.alert("오류", "도서 추천 중 오류가 발생했습니다.");
    } finally {
      setCategoryLoading(false);
    }
  };

  const startGenerating = async (book: Book) => {
    setSelectedBook(book);
    setGenerationError(null);
    setErrorBook(null);
    setBooks([]);
    setSelectedCategory(null);
    setGenerating(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await generateActions(book.title, book.author ?? "", book.category, [], controller.signal);
      if (controller.signal.aborted) return;
      navigation.navigate("ActionDetail", {
        item: res.data.action_items?.[0] ?? null,
        allItems: res.data.action_items ?? [],
        bookTitle: book.title,
        bookThumbnail: book.thumbnail ?? "",
        bookCategory: res.data.book_category,
        bookSummary: res.data.book_summary,
        reviewSources: res.data.review_sources ?? [],
        newGeneration: true,
      });
    } catch (e: any) {
      if (controller.signal.aborted) return;
      const msg =
        e?.response?.data?.detail ??
        (e?.code === "ECONNABORTED" ? "요청 시간이 초과됐습니다." : "착즙 중 오류가 발생했습니다.");
      setErrorBook(book);
      setGenerationError(msg);
    } finally {
      if (!controller.signal.aborted) {
        setGenerating(false);
        setSelectedBook(null);
      }
    }
  };

  const handleCancelGeneration = () => {
    abortRef.current?.abort();
    setGenerating(false);
    setSelectedBook(null);
    setLongWait(false);
  };

  // ── 착즙 로딩 화면 ───────────────────────────────────────────────────────
  if (generating) {
    const step = EXTRACTION_MSGS[Math.min(currentStep, EXTRACTION_MSGS.length - 1)];
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingOuter}>
          <View style={styles.loadingCard}>
            <Text style={styles.loadingHeadline}>착즙 중 🍃</Text>
            <Text style={styles.loadingBookTitle} numberOfLines={2}>
              {selectedBook?.title}
            </Text>

            {/* 즙기 + 회전 블레이드 */}
            <View style={styles.juicerWrap}>
              {selectedBook?.thumbnail ? (
                <Image source={{ uri: selectedBook.thumbnail }} style={styles.loadingThumb} />
              ) : (
                <View style={styles.loadingThumbEmpty}>
                  <Text style={{ fontSize: 28 }}>📚</Text>
                </View>
              )}
              <View style={styles.juicerBody}>
                <Animated.Text style={[styles.bladeSpin, { transform: [{ rotate: spin }] }]}>
                  ✳︎
                </Animated.Text>
              </View>
              {/* 주스 채우기 컵 */}
              <View style={styles.juiceCup}>
                <Animated.View style={[styles.juiceFill, { height: juiceHeight }]} />
              </View>
            </View>

            {/* 메시지 */}
            <View style={styles.extractionMsg}>
              <Text style={styles.extractionEmoji}>{step.emoji}</Text>
              <View>
                <Text style={styles.extractionLabel}>{step.label}</Text>
                <Text style={styles.extractionSub}>{step.sub}</Text>
              </View>
            </View>

            <Text style={styles.loadingHint}>보통 40~60초 소요됩니다</Text>
            {longWait && (
              <Text style={styles.longWaitText}>
                평소보다 조금 더 걸리고 있어요{"\n"}잠시만 기다려주세요 🌿
              </Text>
            )}
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelGeneration}>
              <Text style={styles.cancelBtnText}>착즙 취소</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── 에러 화면 ─────────────────────────────────────────────────────────────
  if (generationError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingOuter}>
          <View style={styles.loadingCard}>
            <Text style={styles.errorIcon}>🍋</Text>
            <Text style={styles.errorTitle}>즙 짜기 실패</Text>
            <Text style={styles.errorMessage}>{generationError}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => errorBook && startGenerating(errorBook)}
            >
              <Text style={styles.retryBtnText}>🔄 다시 짜기</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => { setGenerationError(null); setErrorBook(null); }}
            >
              <Text style={styles.backBtnText}>돌아가기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── 메인 화면 ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>책즙기 🧃</Text>
          <Text style={styles.subtitle}>읽지 말고, 짜라</Text>
        </View>
        <TouchableOpacity
          style={styles.myLifeBtn}
          onPress={() => navigation.navigate("MyLife")}
          accessibilityRole="button"
          accessibilityLabel="나의 책즙 보관함으로 이동"
        >
          <Text style={styles.myLifeBtnText}>내 책즙 →</Text>
        </TouchableOpacity>
      </View>

      {/* 이번 달 게이지 */}
      <JuiceBar done={doneCount} goal={10} />

      {/* 검색 바 */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="짤 책 제목을 입력하세요 📚"
            placeholderTextColor={COLORS.textLight}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          />
          {autocompleteLoading ? (
            <ActivityIndicator size="small" color={COLORS.primary} style={styles.searchIcon} />
          ) : null}
          <TouchableOpacity
            style={styles.searchBtn}
            onPress={handleSearch}
            accessibilityRole="button"
            accessibilityLabel="책 검색"
          >
            <Text style={styles.searchBtnText}>검색</Text>
          </TouchableOpacity>
        </View>

        {/* 자동완성 드롭다운 */}
        {showSuggestions && suggestions.length > 0 && (
          <View style={styles.dropdown}>
            {suggestions.map((book, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.dropdownItem,
                  idx < suggestions.length - 1 && styles.dropdownDivider,
                ]}
                onPress={() => handleSelectSuggestion(book)}
              >
                {book.thumbnail ? (
                  <Image source={{ uri: book.thumbnail }} style={styles.dropdownThumb} />
                ) : (
                  <View style={[styles.dropdownThumb, styles.dropdownThumbEmpty]}>
                    <Text style={{ fontSize: 12 }}>📚</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.dropdownTitle} numberOfLines={1}>{book.title}</Text>
                  {book.author ? (
                    <Text style={styles.dropdownAuthor}>{book.author}</Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {!autocompleteLoading && searchText.trim().length >= 2 && suggestions.length === 0 && showSuggestions === false && (
          <View style={styles.dropdown}>
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => startGenerating({ title: searchText.trim(), author: "" })}
            >
              <View style={[styles.dropdownThumb, styles.dropdownThumbEmpty]}>
                <Text style={{ fontSize: 12 }}>🍹</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.dropdownTitle} numberOfLines={1}>
                  "{searchText.trim()}" 즉석 착즙
                </Text>
                <Text style={styles.dropdownAuthor}>검색 결과 없음 — 직접 짜기</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 카테고리 */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>카테고리별 착즙</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
          keyboardShouldPersistTaps="handled"
        >
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat;
            const color = getCategoryColor(cat);
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryBtn,
                  { borderColor: color },
                  isActive && { backgroundColor: color },
                ]}
                onPress={() => handleCategoryTap(cat)}
              >
                <Text style={[styles.categoryBtnText, { color: isActive ? "#fff" : color }]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 책 목록 / 즙기 / 가이드 */}
      {categoryLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingCatText}>{selectedCategory} 도서 즙 준비 중...</Text>
        </View>
      ) : books.length > 0 ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.resultCount}>
            {bookListTitle} {books.length}권 — 탭하면 즉시 착즙
          </Text>
          {books.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.bookCard}
              onPress={() => startGenerating(item)}
              activeOpacity={0.85}
            >
              {item.thumbnail ? (
                <Image source={{ uri: item.thumbnail }} style={styles.bookThumb} />
              ) : (
                <View style={[styles.bookThumb, styles.bookThumbPlaceholder]}>
                  <Text style={styles.bookThumbIcon}>📚</Text>
                </View>
              )}
              <View style={styles.bookInfo}>
                <Text style={styles.bookTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.bookAuthor}>{item.author}</Text>
                {item.description ? (
                  <Text style={styles.bookDesc} numberOfLines={2}>{item.description}</Text>
                ) : null}
              </View>
              <Text style={styles.extractBtn}>착즙 🍹</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.center}>
          <JuicerMachine bookTitle={undefined} isExtracting={false} />
          <View style={styles.guideSteps}>
            <Text style={styles.guideStep}>① 책 제목 검색 또는 카테고리 선택</Text>
            <Text style={styles.guideStep}>② AI가 핵심 인사이트를 착즙</Text>
            <Text style={styles.guideStep}>③ 내 책즙 보관함에서 매일 한 모금씩</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // 착즙 로딩
  loadingOuter: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  loadingCard: {
    backgroundColor: COLORS.card, borderRadius: 24, padding: 28,
    alignItems: "center", width: "100%", ...SHADOWS.card,
  },
  loadingHeadline: { fontSize: 22, fontWeight: "800", color: COLORS.primary, marginBottom: 6 },
  loadingBookTitle: {
    fontSize: 16, fontWeight: "700", color: COLORS.text, textAlign: "center", marginBottom: 20,
  },
  juicerWrap: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 20 },
  loadingThumb: { width: 60, height: 82, borderRadius: 6 },
  loadingThumbEmpty: {
    width: 60, height: 82, borderRadius: 6, backgroundColor: COLORS.background,
    justifyContent: "center", alignItems: "center",
  },
  juicerBody: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: COLORS.primaryMid,
    justifyContent: "center", alignItems: "center",
    borderWidth: 3, borderColor: COLORS.primary,
  },
  bladeSpin: { fontSize: 28, color: "#fff" },
  juiceCup: {
    width: 32, height: 64, borderWidth: 2, borderColor: COLORS.primaryMid,
    borderRadius: 6, overflow: "hidden", justifyContent: "flex-end",
    backgroundColor: COLORS.background,
  },
  juiceFill: {
    width: "100%", backgroundColor: COLORS.citrus, borderRadius: 4,
  },
  extractionMsg: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: COLORS.background, borderRadius: 14,
    padding: 14, width: "100%", marginBottom: 12,
  },
  extractionEmoji: { fontSize: 24 },
  extractionLabel: { fontSize: 14, fontWeight: "700", color: COLORS.text },
  extractionSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  loadingHint: { fontSize: 11, color: COLORS.textLight },
  longWaitText: {
    fontSize: 12, color: COLORS.primary, marginTop: 8, textAlign: "center", lineHeight: 18,
  },
  cancelBtn: {
    marginTop: 16, paddingVertical: 10, paddingHorizontal: 32,
    borderRadius: 20, borderWidth: 1, borderColor: COLORS.border,
  },
  cancelBtnText: { fontSize: 14, color: COLORS.textMuted },

  // 에러
  errorIcon: { fontSize: 44, marginBottom: 12 },
  errorTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text, marginBottom: 8 },
  errorMessage: {
    fontSize: 14, color: COLORS.textSecondary, textAlign: "center", lineHeight: 22, marginBottom: 24,
  },
  retryBtn: {
    backgroundColor: COLORS.primary, borderRadius: 14,
    paddingVertical: 12, paddingHorizontal: 36, marginBottom: 10,
  },
  retryBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  backBtn: { paddingVertical: 10, paddingHorizontal: 20 },
  backBtnText: { fontSize: 14, color: COLORS.textMuted },

  // 헤더
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
  },
  title: { fontSize: 26, fontWeight: "800", color: COLORS.text },
  subtitle: { fontSize: 12, color: COLORS.primaryMid, marginTop: 2, fontWeight: "600" },
  myLifeBtn: {
    backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  myLifeBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  // 검색
  searchWrapper: { marginHorizontal: 16, marginBottom: 4, zIndex: 10 },
  searchRow: {
    flexDirection: "row", alignItems: "center", backgroundColor: COLORS.card,
    borderRadius: 14, paddingLeft: 14, paddingRight: 6, ...SHADOWS.card,
  },
  searchInput: { flex: 1, height: 48, fontSize: 15, color: COLORS.text },
  searchIcon: { marginRight: 6 },
  searchBtn: {
    backgroundColor: COLORS.primary, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8, marginLeft: 6,
  },
  searchBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  // 드롭다운
  dropdown: {
    position: "absolute", top: 54, left: 0, right: 0,
    backgroundColor: COLORS.card, borderRadius: 12,
    zIndex: 100, overflow: "hidden", ...SHADOWS.dropdown,
  },
  dropdownItem: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 10, gap: 10,
  },
  dropdownDivider: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  dropdownThumb: { width: 36, height: 48, borderRadius: 4, backgroundColor: "#f0f0f0" },
  dropdownThumbEmpty: { justifyContent: "center", alignItems: "center" },
  dropdownTitle: { fontSize: 14, fontWeight: "600", color: COLORS.text },
  dropdownAuthor: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },

  // 카테고리
  section: { marginTop: 12, marginBottom: 4 },
  sectionLabel: {
    fontSize: 11, fontWeight: "700", color: COLORS.textMuted,
    textTransform: "uppercase", letterSpacing: 0.5, marginLeft: 20, marginBottom: 10,
  },
  categoryRow: { paddingHorizontal: 16, gap: 8 },
  categoryBtn: {
    paddingHorizontal: 18, paddingVertical: 9,
    borderRadius: 22, borderWidth: 2, marginRight: 8,
  },
  categoryBtnText: { fontSize: 14, fontWeight: "700" },

  // 책 목록
  resultCount: { marginHorizontal: 16, marginTop: 12, marginBottom: 4, fontSize: 12, color: COLORS.textMuted },
  bookCard: {
    flexDirection: "row", backgroundColor: COLORS.card,
    marginHorizontal: 16, marginVertical: 6, borderRadius: 14, padding: 12,
    alignItems: "center", ...SHADOWS.small,
  },
  bookThumb: { width: 58, height: 78, borderRadius: 6, backgroundColor: "#f0f0f0" },
  bookThumbPlaceholder: { justifyContent: "center", alignItems: "center" },
  bookThumbIcon: { fontSize: 24 },
  bookInfo: { flex: 1, marginLeft: 12, gap: 4 },
  bookTitle: { fontSize: 14, fontWeight: "700", color: COLORS.text, lineHeight: 20 },
  bookAuthor: { fontSize: 12, color: COLORS.textSecondary },
  bookDesc: { fontSize: 11, color: COLORS.textMuted, lineHeight: 16 },
  extractBtn: { fontSize: 12, fontWeight: "700", color: COLORS.primary, marginLeft: 8 },

  // 가이드
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  guideSteps: { gap: 6, alignSelf: "flex-start", marginTop: 12, paddingHorizontal: 8 },
  guideStep: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 24 },
  loadingCatText: { fontSize: 13, color: COLORS.textMuted, marginTop: 8 },
});
