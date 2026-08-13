import type { Config } from "tailwindcss";
const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "sidebar-mist": "var(--color-sidebar-mist)",
        "pure-white": "var(--color-pure-white)",
        "graphite-ink": "var(--color-graphite-ink)",
        "mid-ash": "var(--color-mid-ash)",
        hollow: "var(--color-hollow)",
        hairline: "var(--color-hairline)",
        "hover-veil": "var(--color-hover-veil)",
        "ink-press": "var(--color-ink-press)",
        "deep-charcoal": "var(--color-deep-charcoal)",
        "edge-gray": "var(--color-edge-gray)",
        // Backward-compatible aliases
        vellum: "var(--vellum-bg)",
        "vellum-surface": "var(--vellum-surface)",
        "vellum-border": "var(--vellum-border)",
        "vellum-border-light": "var(--vellum-border-light)",
        ink: "var(--ink)",
        "ink-secondary": "var(--ink-secondary)",
        "ink-muted": "var(--ink-muted)",
        "ink-faint": "var(--ink-faint)",
        terracotta: "var(--terracotta)",
        danger: "var(--danger)",
        "danger-bg": "var(--danger-bg)",
        "danger-border": "var(--danger-border)",
      },
      fontFamily: {
        sans: ["var(--font-apple-system-body)"],
        serif: ["var(--font-apple-system-body)"],
        mono: ["var(--font-mono)"],
      },
      fontSize: {
        "stitch-display": ["56px", { lineHeight: "1.2", fontWeight: "330" }],
        "stitch-h2": ["30px", { lineHeight: "1.33", fontWeight: "400" }],
        "stitch-h3": ["24px", { lineHeight: "1.33", fontWeight: "400" }],
        "stitch-h4": ["18px", { lineHeight: "1.33", fontWeight: "400" }],
        "stitch-body-lg": ["16px", { lineHeight: "1.5", fontWeight: "400" }],
        "stitch-body-md": ["15px", { lineHeight: "1.4", fontWeight: "400" }],
        "stitch-body-sm": ["14px", { lineHeight: "1.4", fontWeight: "400" }],
        "stitch-caption": ["12px", { lineHeight: "1.33", fontWeight: "400" }],
        "stitch-label-caps": ["11px", { lineHeight: "1.33", fontWeight: "500" }],
      },
      spacing: {
        "stitch-unit": "var(--stitch-unit)",
        "stitch-gap-xs": "var(--stitch-gap-xs)",
        "stitch-gap-md": "var(--stitch-gap-md)",
        "stitch-gap-lg": "var(--stitch-gap-lg)",
        "stitch-section-xl": "var(--stitch-section-xl)",
      },
      maxWidth: {
        "stitch-container-max": "var(--stitch-container-max)",
      },
      borderRadius: {
        vellum: "var(--radius-lg)",
      },
    },
  },
  plugins: [],
};
export default config;
