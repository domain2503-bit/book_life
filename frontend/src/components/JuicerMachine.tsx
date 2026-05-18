import React, { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet } from "react-native";
import { COLORS } from "../constants/theme";

interface Props {
  bookTitle?: string;
  isExtracting?: boolean;
}

export default function JuicerMachine({ bookTitle, isExtracting }: Props) {
  const bookDropY = useRef(new Animated.Value(-60)).current;
  const bookOpacity = useRef(new Animated.Value(0)).current;
  const machineShake = useRef(new Animated.Value(0)).current;
  const dropScale = useRef(new Animated.Value(0)).current;
  const dropOpacity = useRef(new Animated.Value(0)).current;
  const bladeRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (bookTitle) {
      bookOpacity.setValue(1);
      bookDropY.setValue(-60);
      dropScale.setValue(0);
      dropOpacity.setValue(0);

      Animated.sequence([
        Animated.spring(bookDropY, {
          toValue: 0,
          speed: 12,
          bounciness: 8,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(machineShake, { toValue: 6, duration: 60, useNativeDriver: true }),
          Animated.timing(machineShake, { toValue: -6, duration: 60, useNativeDriver: true }),
          Animated.timing(machineShake, { toValue: 4, duration: 60, useNativeDriver: true }),
          Animated.timing(machineShake, { toValue: 0, duration: 60, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(bookOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.spring(dropScale, { toValue: 1, speed: 14, bounciness: 10, useNativeDriver: true }),
          Animated.timing(dropOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]),
      ]).start();
    }
  }, [bookTitle]);

  useEffect(() => {
    if (isExtracting) {
      Animated.loop(
        Animated.timing(bladeRotate, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        })
      ).start();
    } else {
      bladeRotate.setValue(0);
    }
  }, [isExtracting]);

  const spin = bladeRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={styles.container}>
      {/* 책 낙하 */}
      <Animated.View
        style={[
          styles.fallingBook,
          { transform: [{ translateY: bookDropY }], opacity: bookOpacity },
        ]}
      >
        <Text style={styles.bookEmoji}>📚</Text>
        {bookTitle && (
          <Text style={styles.bookTitle} numberOfLines={1}>
            {bookTitle}
          </Text>
        )}
      </Animated.View>

      {/* 즙기 본체 */}
      <Animated.View
        style={[styles.machine, { transform: [{ translateX: machineShake }] }]}
      >
        <View style={styles.machineTop}>
          <Text style={styles.machineTopText}>책즙기</Text>
          {isExtracting && (
            <Animated.Text
              style={[styles.blade, { transform: [{ rotate: spin }] }]}
            >
              ✳︎
            </Animated.Text>
          )}
        </View>
        <View style={styles.machineBody}>
          <Text style={styles.machineBodyEmoji}>🫙</Text>
        </View>
        <View style={styles.machineSpout} />
      </Animated.View>

      {/* 즙 방울 */}
      <Animated.View
        style={[
          styles.drop,
          { transform: [{ scale: dropScale }], opacity: dropOpacity },
        ]}
      >
        <Text style={styles.dropText}>🟢</Text>
        <Text style={styles.dropLabel}>즙 추출 준비!</Text>
      </Animated.View>

      {!bookTitle && !isExtracting && (
        <Text style={styles.hint}>짤 책을 검색해서 넣어주세요 👆</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    minHeight: 180,
  },
  fallingBook: {
    alignItems: "center",
    position: "absolute",
    top: 0,
    zIndex: 10,
  },
  bookEmoji: {
    fontSize: 32,
  },
  bookTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.text,
    maxWidth: 120,
    textAlign: "center",
    marginTop: 2,
  },
  machine: {
    alignItems: "center",
    marginTop: 40,
  },
  machineTop: {
    width: 100,
    height: 36,
    backgroundColor: COLORS.primary,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  machineTopText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 13,
  },
  blade: {
    fontSize: 16,
    color: "#fff",
  },
  machineBody: {
    width: 120,
    height: 80,
    backgroundColor: COLORS.primaryLighter,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  machineBodyEmoji: {
    fontSize: 36,
  },
  machineSpout: {
    width: 16,
    height: 24,
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  drop: {
    alignItems: "center",
    marginTop: 8,
  },
  dropText: {
    fontSize: 24,
  },
  dropLabel: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "600",
    marginTop: 2,
  },
  hint: {
    marginTop: 12,
    fontSize: 13,
    color: COLORS.textMuted,
    fontStyle: "italic",
  },
});
