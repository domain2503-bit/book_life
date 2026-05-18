export const COLORS = {
  // 주스 브랜드 컬러
  primary: "#2D7D5E",
  primaryLight: "#2D7D5E22",
  primaryMid: "#52A67A",
  primaryLighter: "#A8D5B5",

  // 추출/로딩 — 시트러스
  citrus: "#FF8C42",
  citrusLight: "#FFE0C8",

  // 배경/서피스
  background: "#F2F9F1",
  card: "#FFFFFF",

  // 텍스트
  text: "#1A2E1E",
  textSecondary: "#3D5A46",
  textMuted: "#7A9B83",
  textLight: "#B5CEBC",

  // 기타
  border: "#DFF0E5",
  success: "#2D7D5E",
  successLight: "#2D7D5E22",
  danger: "#E76F51",
  dangerLight: "#E76F5122",

  // 카테고리별 주스 컬러
  category: {
    "투자":    "#F4A261",
    "육아":    "#E76F51",
    "자기계발": "#52A67A",
    "업무":    "#457B9D",
    "건강":    "#2D6A4F",
    "인문학":  "#9B72CF",
    "경제":    "#F4C430",
  } as Record<string, string>,
};

export const SHADOWS = {
  card: {
    shadowColor: "#2D7D5E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
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
