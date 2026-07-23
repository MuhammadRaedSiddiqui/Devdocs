import type { Config } from "tailwindcss";
const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        vellum: "var(--vellum-bg)", "vellum-surface": "var(--vellum-surface)",
        "vellum-border": "var(--vellum-border)", "vellum-border-light": "var(--vellum-border-light)",
        ink: "var(--ink)", "ink-secondary": "var(--ink-secondary)",
        "ink-muted": "var(--ink-muted)", "ink-faint": "var(--ink-faint)",
        terracotta: "var(--terracotta)",
        danger: "var(--danger)", "danger-bg": "var(--danger-bg)", "danger-border": "var(--danger-border)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        serif: ["var(--font-lora)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "Menlo", "monospace"],
      },
      borderRadius: { vellum: "9.6px" },
    },
  },
  plugins: [],
};
export default config;
