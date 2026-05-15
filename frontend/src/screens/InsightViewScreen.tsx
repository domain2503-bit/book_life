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
} from "react-native";
import { searchBooks, recommendBooks, generateActions } from "../api/client";
import { Book, Category, CATEGORIES, RootStackParamList } from "../types";
import type { StackScreenProps } from "@react-navigation/stack";
import { COLORS, SHADOWS, getCategoryColor } from "../constants/theme";

const GENERATION_STEPS = [
  { emoji: "🔍", label: "서평 수집 중", sub: "네이버에서 독자 리뷰를 모으고 있어요" },
  { emoji: "📖", label: "책 내용 파악 중", sub: "수집한 서평을 읽고 분석하고 있어요" },
  { emoji: "🤖", label: "인사이트 추출 중", sub: "AI가 핵심 메시지를 정리하고 있어요" },
  { emoji: "✨", label: "액션 아이템 생성 중", sub: "실천 가능한 15개 아이템을 만들고 있어요" },
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
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // 생성 중 스텝 순차 진행 + 60초 대기 메시지
  useEffect(() => {
    if (!generating) {
      setCurrentStep(0);
      setLongWait(false);
      return;
    }
    setCurrentStep(0);
    setLongWait(false);
    const delays = [8000, 20000, 35000];
    const stepTimers = delays.map((d, i) => setTimeout(() => setCurrentStep(i + 1), d));
    const longWaitTimer = setTimeout(() => setLongWait(true), 60000);
    return () => {
      stepTimers.forEach(clearTimeout);
      clearTimeout(longWaitTimer);
    };
  }, [generating]);


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
        (e?.code === "ECONNABORTED" ? "요청 시간이 초과됐습니다." : "인사이트 생성 중 오류가 발생했습니다.");
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

  // ── 생성 중 로딩 화면 ────────────────────────────────────────────────────
  if (generating) {
    const step = GENERATION_STEPS[Math.min(currentStep, GENERATION_STEPS.length - 1)];
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingOuter}>
          <View style={styles.loadingCard}>
            {/* 책 썸네일 또는 아이콘 */}
            {selectedBook?.thumbnail ? (
              <Image source={{ uri: selectedBook.thumbnail }} style={styles.loadingThumb} />
            ) : (
              <View style={styles.loadingThumbPlaceholder}>
                <Text style={styles.loadingThumbIcon}>📚</Text>
              </View>
            )}

            <Text style={styles.loadingBookTitle} numberOfLines={2}>
              {selectedBook?.title}
            </Text>
            {selectedBook?.author ? (
              <Text style={styles.loadingBookAuthor}>{selectedBook.author}</Text>
            ) : null}

            {/* 진행 스텝 도트 */}
            <View style={styles.stepDotsRow}>
              {GENERATION_STEPS.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.stepDot,
                    i < currentStep && styles.stepDotDone,
                    i === currentStep && styles.stepDotActive,
                  ]}
                />
              ))}
            </View>

            {/* 현재 스텝 텍스트 */}
            <View style={styles.stepTextBox}>
              <Text style={styles.stepEmoji}>{step.emoji}</Text>
              <View>
                <Text style={styles.stepLabel}>{step.label}</Text>
                <Text style={styles.stepSub}>{step.sub}</Text>
              </View>
            </View>

            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 16 }} />
            <Text style={styles.loadingHint}>보통 40~60초 소요됩니다</Text>
            {longWait && (
              <Text style={styles.longWaitText}>
                평소보다 조금 더 걸리고 있어요{"\n"}잠시만 기다려주세요
              </Text>
            )}
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={handleCancelGeneration}
              accessibilityRole="button"
              accessibilityLabel="인사이트 생성 취소"
            >
              <Text style={styles.cancelBtnText}>취소</Text>
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
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorTitle}>인사이트 생성 실패</Text>
            <Text style={styles.errorMessage}>{generationError}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => errorBook && startGenerating(errorBook)}
            >
              <Text style={styles.retryBtnText}>다시 시도</Text>
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

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Action Log</Text>
          <Text style={styles.subtitle}>독서 인사이트 → 실천 액션</Text>
        </View>
        <TouchableOpacity
          style={styles.myLifeBtn}
          onPress={() => navigation.navigate("MyLife")}
          accessibilityRole="button"
          accessibilityLabel="My Life 보관함으로 이동"
        >
          <Text style={styles.myLifeBtnText}>My Life →</Text>
        </TouchableOpacity>
      </View>

      {/* 검색 바 */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="읽은 책 제목을 입력하세요"
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

        {/* 검색 결과 없을 때 직접 생성 유도 */}
        {!autocompleteLoading && searchText.trim().length >= 2 && suggestions.length === 0 && showSuggestions === false && (
          <View style={styles.dropdown}>
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => startGenerating({ title: searchText.trim(), author: "" })}
            >
              <View style={[styles.dropdownThumb, styles.dropdownThumbEmpty]}>
                <Text style={{ fontSize: 12 }}>✨</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.dropdownTitle} numberOfLines={1}>
                  "{searchText.trim()}" 인사이트 바로 추출
                </Text>
                <Text style={styles.dropdownAuthor}>검색 결과 없음 — 직접 생성하기</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 카테고리 버튼 */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>관심사로 찾기</Text>
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

      {/* 카테고리 도서 목록 */}
      {categoryLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingCatText}>{selectedCategory} 도서를 불러오는 중...</Text>
        </View>
      ) : books.length > 0 ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.resultCount}>
            {bookListTitle} {books.length}권 — 탭하면 인사이트 추출
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
              <Text style={styles.arrowIcon}>›</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.center}>
          <View style={styles.guideCard}>
            <Text style={styles.guideIcon}>📖</Text>
            <Text style={styles.guideTitle}>책 인사이트를 바로 추출하세요</Text>
            <View style={styles.guideSteps}>
              <Text style={styles.guideStep}>① 읽은 책 제목 검색</Text>
              <Text style={styles.guideStep}>② AI가 핵심 인사이트 15개 생성</Text>
              <Text style={styles.guideStep}>③ My Life에 담고 실천 계획 작성</Text>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // 로딩 화면
  loadingOuter: {
    flex: 1, justifyContent: "center", alignItems: "center", padding: 24,
  },
  loadingCard: {
    backgroundColor: COLORS.card, borderRadius: 24, padding: 28,
    alignItems: "center", width: "100%", gap: 0,
    ...SHADOWS.card,
  },
  loadingThumb: {
    width: 80, height: 108, borderRadius: 8, marginBottom: 16,
  },
  loadingThumbPlaceholder: {
    width: 80, height: 108, borderRadius: 8, backgroundColor: "#f0f0f8",
    justifyContent: "center", alignItems: "center", marginBottom: 16,
  },
  loadingThumbIcon: { fontSize: 32 },
  loadingBookTitle: {
    fontSize: 18, fontWeight: "800", color: COLORS.text,
    textAlign: "center", lineHeight: 26,
  },
  loadingBookAuthor: {
    fontSize: 13, color: COLORS.textMuted, marginTop: 4, marginBottom: 20,
  },
  stepDotsRow: {
    flexDirection: "row", gap: 8, marginBottom: 20,
  },
  stepDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: "#e0e0f0",
  },
  stepDotDone: { backgroundColor: COLORS.success },
  stepDotActive: { backgroundColor: COLORS.primary, width: 24 },
  stepTextBox: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#f5f5fa", borderRadius: 14, padding: 14, width: "100%",
  },
  stepEmoji: { fontSize: 24 },
  stepLabel: { fontSize: 14, fontWeight: "700", color: COLORS.text },
  stepSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  loadingHint: {
    fontSize: 11, color: COLORS.textLight, marginTop: 14,
  },
  longWaitText: {
    fontSize: 12, color: COLORS.primary, marginTop: 8,
    textAlign: "center", lineHeight: 18,
  },
  cancelBtn: {
    marginTop: 20, paddingVertical: 10, paddingHorizontal: 32,
    borderRadius: 20, borderWidth: 1, borderColor: COLORS.border,
  },
  cancelBtnText: { fontSize: 14, color: COLORS.textMuted },

  // 에러 화면
  errorIcon: { fontSize: 40, marginBottom: 12 },
  errorTitle: {
    fontSize: 18, fontWeight: "800", color: COLORS.text, marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14, color: COLORS.textSecondary, textAlign: "center",
    lineHeight: 22, marginBottom: 24,
  },
  retryBtn: {
    backgroundColor: COLORS.primary, borderRadius: 14,
    paddingVertical: 12, paddingHorizontal: 36, marginBottom: 10,
  },
  retryBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  backBtn: {
    paddingVertical: 10, paddingHorizontal: 20,
  },
  backBtnText: { fontSize: 14, color: COLORS.textMuted },

  // 헤더
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
  },
  title: { fontSize: 26, fontWeight: "800", color: COLORS.text },
  subtitle: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  myLifeBtn: {
    backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  myLifeBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  // 검색
  searchWrapper: { marginHorizontal: 16, marginBottom: 4, zIndex: 10 },
  searchRow: {
    flexDirection: "row", alignItems: "center", backgroundColor: COLORS.card,
    borderRadius: 14, paddingLeft: 14, paddingRight: 6,
    ...SHADOWS.card,
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
  dropdownThumb: {
    width: 36, height: 48, borderRadius: 4, backgroundColor: "#f0f0f0",
  },
  dropdownThumbEmpty: { justifyContent: "center", alignItems: "center" },
  dropdownTitle: { fontSize: 14, fontWeight: "600", color: COLORS.text },
  dropdownAuthor: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },

  // 카테고리
  section: { marginTop: 16, marginBottom: 4 },
  sectionLabel: {
    fontSize: 11, fontWeight: "700", color: COLORS.textLight,
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
  arrowIcon: { fontSize: 24, color: COLORS.textLight, marginLeft: 8 },

  // 가이드 / 빈 상태
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  guideCard: {
    backgroundColor: COLORS.card, borderRadius: 20, padding: 28,
    alignItems: "center", width: "100%", gap: 12,
    ...SHADOWS.small,
  },
  guideIcon: { fontSize: 40, marginBottom: 4 },
  guideTitle: { fontSize: 16, fontWeight: "700", color: COLORS.text, textAlign: "center" },
  guideSteps: { gap: 6, alignSelf: "flex-start", marginTop: 4 },
  guideStep: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22 },

  loadingCatText: { fontSize: 13, color: COLORS.textMuted, marginTop: 8 },
});
