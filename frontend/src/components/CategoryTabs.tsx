import React from "react";
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from "react-native";
import { Category, CATEGORIES } from "../types";
import { COLORS, getCategoryColor } from "../constants/theme";

interface Props {
  selected: Category | "전체";
  onSelect: (cat: Category | "전체") => void;
}

const ALL_TABS: (Category | "전체")[] = ["전체", ...CATEGORIES];

export default function CategoryTabs({ selected, onSelect }: Props) {
  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {ALL_TABS.map((tab) => {
          const isActive = selected === tab;
          const color = tab === "전체" ? COLORS.primary : getCategoryColor(tab);
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => onSelect(tab)}
              style={[
                styles.tab,
                { borderColor: color },
                isActive && { backgroundColor: color },
              ]}
              activeOpacity={0.75}
            >
              <Text style={[styles.label, { color: isActive ? "#fff" : color }]}>
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { height: 52, justifyContent: "center" },
  container: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, gap: 8,
  },
  tab: {
    paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5, alignSelf: "center",
  },
  label: { fontSize: 13, fontWeight: "600" },
});
