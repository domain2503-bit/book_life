import React, { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet } from "react-native";
import { COLORS, getCategoryColor } from "../constants/theme";
import type { ActionItem } from "../types";

interface Props {
  items: ActionItem[];
}

export default function NutritionLabel({ items }: Props) {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const cat = item.book_category || "기타";
    counts[cat] = (counts[cat] ?? 0) + 1;
  }
  const total = items.length;
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  if (total === 0) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>📊 지식 영양소 성분표</Text>
      <View style={styles.divider} />
      {sorted.map(([cat, count]) => {
        const pct = Math.round((count / total) * 100);
        const color = getCategoryColor(cat);
        return <NutritionRow key={cat} label={cat} pct={pct} color={color} />;
      })}
    </View>
  );
}

function NutritionRow({ label, pct, color }: { label: string; pct: number; color: string }) {
  const fillAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fillAnim, {
      toValue: pct / 100,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  const fillWidth = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, { width: fillWidth, backgroundColor: color }]} />
      </View>
      <Text style={styles.pct}>{pct}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  title: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 10,
  },
  divider: {
    height: 2,
    backgroundColor: COLORS.text,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  rowLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.text,
    width: 56,
  },
  barTrack: {
    flex: 1,
    height: 10,
    backgroundColor: COLORS.border,
    borderRadius: 6,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 6,
  },
  pct: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textMuted,
    width: 34,
    textAlign: "right",
  },
});
