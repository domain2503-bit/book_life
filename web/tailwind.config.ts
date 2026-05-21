import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        primary: "#ff7a00",
        "primary-light": "#fff4ec",
        bg: "#fcfaf7",
        card: "#ffffff",
        success: "#2ebd59",
        "success-light": "#e8f9ee",
        danger: "#e76f51",
        "text-main": "#1a1a2e",
        "text-secondary": "#555555",
        "text-muted": "#888888",
        "text-light": "#bbbbbb",
        border: "#f0f0f0",
        "border-soft": "#f5f5f5",
      },
      fontFamily: {
        sans: ["Pretendard", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
      },
      maxWidth: { app: "480px" },
      boxShadow: {
        card: "0 2px 12px rgba(0,0,0,0.07)",
        sm2: "0 1px 6px rgba(0,0,0,0.06)",
        md2: "0 4px 16px rgba(0,0,0,0.10)",
        dropdown: "0 8px 24px rgba(0,0,0,0.12)",
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "24px",
      },
    },
  },
  plugins: [],
};

export default config;
