import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { ActionItem } from "../types";

const CATEGORY_COLORS: Record<string, string> = {
  투자: "#f4a261",
  육아: "#e76f51",
  자기계발: "#2a9d8f",
  업무: "#457b9d",
  건강: "#2d6a4f",
};

interface Props {
  item: ActionItem;
  isDone?: boolean;
  onPress: () => void;
  onToggleDone?: () => void;
}

export default function ActionCard({
  item,
  isDone = false,
  onPress,
  onToggleDone,
}: Props) {
  const color = CATEGORY_COLORS[item.category] || "#6c63ff";

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.categoryBar, { backgroundColor: color }]} />
      <View style={styles.content}>
        <View style={styles.header}>
          {/* [카테고리] 책제목 통합 태그 */}
          <View style={[styles.badge, { backgroundColor: color + "22" }]}>
            <Text style={[styles.badgeText, { color }]}>
              {item.category}{item.book_title ? ` · ${item.book_title}` : ""}
            </Text>
          </View>
          {item.page ? (
            <Text style={styles.page}>{item.page}</Text>
          ) : null}
        </View>

        <Text style={styles.point} numberOfLines={2}>
          {item.point}
        </Text>
        <Text style={styles.action} numberOfLines={2}>
          → {item.action}
        </Text>

        <View style={styles.footer}>
          {onToggleDone && (
            <TouchableOpacity
              style={[styles.doneBtn, isDone && styles.doneBtnActive]}
              onPress={onToggleDone}
            >
              <Text style={[styles.doneBtnText, isDone && styles.doneBtnTextActive]}>
                {isDone ? "✓ 완료" : "실천하기"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 14,
    marginHorizontal: 16,
    marginVertical: 7,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: "hidden",
  },
  categoryBar: {
    width: 5,
  },
  content: {
    flex: 1,
    padding: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  bookTitle: {
    flex: 1,
    fontSize: 11,
    color: "#999",
  },
  page: {
    fontSize: 11,
    color: "#bbb",
  },
  point: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a2e",
    lineHeight: 20,
    marginBottom: 6,
  },
  action: {
    fontSize: 13,
    color: "#555",
    lineHeight: 18,
  },
  footer: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  doneBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#ccc",
  },
  doneBtnActive: {
    backgroundColor: "#2a9d8f",
    borderColor: "#2a9d8f",
  },
  doneBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#888",
  },
  doneBtnTextActive: {
    color: "#fff",
  },
});
