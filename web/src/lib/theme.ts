export const CATEGORY_COLORS: Record<string, string> = {
  경제경영: "#f4a261",
  자기계발: "#2a9d8f",
  인문: "#9b72cf",
  유아: "#e76f51",
  건강: "#2d6a4f",
  산업트렌드: "#457b9d",
};

export const CATEGORY_ICONS: Record<string, string> = {
  경제경영: "💰",
  자기계발: "🚀",
  인문: "🏛️",
  유아: "👶",
  건강: "🌿",
  산업트렌드: "🔭",
};

export function getCategoryColor(cat?: string): string {
  return (cat && CATEGORY_COLORS[cat]) ?? "#6c63ff";
}

export function hex(color: string, alpha: number): string {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");
  return `${color}${a}`;
}
