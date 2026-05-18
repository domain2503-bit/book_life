export const COLORS = {
  primary: "#6c63ff",
  primaryLight: "#6c63ff22",
  background: "#f5f5fa",
  card: "#ffffff",
  text: "#1a1a2e",
  textSecondary: "#555",
  textMuted: "#888",
  textLight: "#bbb",
  border: "#f0f0f0",
  success: "#2a9d8f",
  successLight: "#2a9d8f22",
  danger: "#e76f51",
  dangerLight: "#e76f5122",

  category: {
    "투자": "#f4a261",
    "육아": "#e76f51",
    "자기계발": "#2a9d8f",
    "업무": "#457b9d",
    "건강": "#2d6a4f",
  } as Record<string, string>,
};

export const SHADOWS = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  small: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dropdown: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
  },
};

export const getCategoryColor = (category: string): string =>
  COLORS.category[category] ?? COLORS.primary;

export const TYPOGRAPHY = {
  headline:  { fontSize: 26, fontWeight: "800" as const, lineHeight: 34 },
  title:     { fontSize: 18, fontWeight: "700" as const, lineHeight: 26 },
  subtitle:  { fontSize: 15, fontWeight: "600" as const, lineHeight: 22 },
  body:      { fontSize: 14, fontWeight: "400" as const, lineHeight: 21 },
  bodyBold:  { fontSize: 14, fontWeight: "600" as const, lineHeight: 21 },
  caption:   { fontSize: 12, fontWeight: "400" as const, lineHeight: 17 },
  micro:     { fontSize: 11, fontWeight: "500" as const, lineHeight: 15 },
};
