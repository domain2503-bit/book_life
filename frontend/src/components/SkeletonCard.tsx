import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { COLORS, SHADOWS } from "../constants/theme";

function Bone({ style }: { style: object }) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return <Animated.View style={[styles.bone, style, { opacity }]} />;
}

export default function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={styles.bar} />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Bone style={styles.badge} />
          <Bone style={styles.date} />
        </View>
        <Bone style={styles.line1} />
        <Bone style={styles.line2} />
        <Bone style={styles.line3} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: COLORS.card,
    marginHorizontal: 16, marginVertical: 5,
    borderRadius: 16, overflow: "hidden", ...SHADOWS.small,
  },
  bar: { width: 4, backgroundColor: COLORS.border },
  content: { flex: 1, padding: 14, gap: 8 },
  topRow: { flexDirection: "row", justifyContent: "space-between" },
  bone: { backgroundColor: "#e8e8f0", borderRadius: 6 },
  badge: { height: 16, width: 80, borderRadius: 8 },
  date: { height: 12, width: 40 },
  line1: { height: 14, width: "90%" },
  line2: { height: 14, width: "75%" },
  line3: { height: 12, width: "50%" },
});
