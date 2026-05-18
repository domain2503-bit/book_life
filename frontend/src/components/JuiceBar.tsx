import React, { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet } from "react-native";
import { COLORS } from "../constants/theme";

interface Props {
  done: number;
  goal?: number;
}

export default function JuiceBar({ done, goal = 10 }: Props) {
  const fillAnim = useRef(new Animated.Value(0)).current;
  const ratio = Math.min(done / goal, 1);

  useEffect(() => {
    Animated.timing(fillAnim, {
      toValue: ratio,
      duration: 900,
      useNativeDriver: false,
    }).start();
  }, [done, goal]);

  const fillWidth = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>🧃 이번 달 책즙</Text>
        <Text style={styles.count}>
          <Text style={styles.doneNum}>{done}</Text>
          <Text style={styles.goalNum}> / {goal}잔</Text>
        </Text>
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width: fillWidth }]} />
      </View>
      <Text style={styles.sub}>
        {done === 0
          ? "첫 번째 책즙을 짜볼까요? 🌱"
          : done >= goal
          ? "이번 달 목표 달성! 🎉"
          : `목표까지 ${goal - done}잔 남았어요`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
  },
  count: {
    fontSize: 14,
  },
  doneNum: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.primary,
  },
  goalNum: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  track: {
    height: 12,
    backgroundColor: COLORS.border,
    borderRadius: 8,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    backgroundColor: COLORS.primaryMid,
    borderRadius: 8,
  },
  sub: {
    marginTop: 8,
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: "center",
  },
});
