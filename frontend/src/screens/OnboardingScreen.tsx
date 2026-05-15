import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS } from "../constants/theme";
import type { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "../types";

const { width } = Dimensions.get("window");

const SLIDES = [
  {
    emoji: "📚",
    title: "책 한 권을\n15개 액션으로",
    body: "읽은 책의 핵심 메시지를\nAI가 즉시 실천 가능한\n인사이트 15개로 정리해드려요.",
    accent: COLORS.primary,
  },
  {
    emoji: "🤖",
    title: "AI가 서평을 읽고\n핵심만 뽑아요",
    body: "네이버 블로그 독자 서평 5개 이상을\n분석해 실생활에 바로 쓸 수 있는\n액션 아이템을 만들어요.",
    accent: "#e07b39",
  },
  {
    emoji: "🌱",
    title: "My Life에 담고\n실천 계획 작성",
    body: "마음에 드는 인사이트를 저장하고\n나만의 실천 계획을 적어두세요.\n한 권이 삶을 바꿉니다.",
    accent: "#2da98c",
  },
];

export const ONBOARDING_KEY = "action_log_onboarding_done";

type Props = StackScreenProps<RootStackParamList, "Onboarding">;

export default function OnboardingScreen({ navigation }: Props) {
  const [pageIndex, setPageIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    setPageIndex(idx);
  };

  const goNext = () => {
    if (pageIndex < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({ x: (pageIndex + 1) * width, animated: true });
    } else {
      finish();
    }
  };

  const finish = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, "1");
    navigation.replace("Main");
  };

  const slide = SLIDES[pageIndex];

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.skipBtn} onPress={finish}>
        <Text style={styles.skipText}>건너뛰기</Text>
      </TouchableOpacity>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {SLIDES.map((s, i) => (
          <View key={i} style={[styles.slide, { width }]}>
            <View style={[styles.emojiCircle, { backgroundColor: s.accent + "18" }]}>
              <Text style={styles.emojiText}>{s.emoji}</Text>
            </View>
            <Text style={[styles.slideTitle, { color: s.accent }]}>{s.title}</Text>
            <Text style={styles.slideBody}>{s.body}</Text>
          </View>
        ))}
      </ScrollView>

      {/* 페이지 도트 */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === pageIndex
                ? [styles.dotActive, { backgroundColor: slide.accent }]
                : styles.dotInactive,
            ]}
          />
        ))}
      </View>

      <TouchableOpacity
        style={[styles.nextBtn, { backgroundColor: slide.accent }]}
        onPress={goNext}
        activeOpacity={0.85}
      >
        <Text style={styles.nextBtnText}>
          {pageIndex < SLIDES.length - 1 ? "다음" : "시작하기"}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa", alignItems: "center" },

  skipBtn: { alignSelf: "flex-end", padding: 16, paddingBottom: 0 },
  skipText: { fontSize: 14, color: COLORS.textMuted, fontWeight: "500" },

  slide: {
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: 36, gap: 20,
  },
  emojiCircle: {
    width: 120, height: 120, borderRadius: 60,
    alignItems: "center", justifyContent: "center", marginBottom: 8,
  },
  emojiText: { fontSize: 52 },
  slideTitle: {
    fontSize: 28, fontWeight: "800", textAlign: "center", lineHeight: 38,
  },
  slideBody: {
    fontSize: 16, color: COLORS.textSecondary,
    textAlign: "center", lineHeight: 26,
  },

  dotsRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  dot: { height: 8, borderRadius: 4 },
  dotActive: { width: 24 },
  dotInactive: { width: 8, backgroundColor: "#d0d0e0" },

  nextBtn: {
    marginHorizontal: 24, marginBottom: 24, width: "85%",
    paddingVertical: 16, borderRadius: 18, alignItems: "center",
  },
  nextBtnText: { color: "#fff", fontSize: 17, fontWeight: "800" },
});
