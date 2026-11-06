/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Exact Tri-Color Palette from new_design.md
        "powder-blue": "#8DB9F0",
        "soft-lavender": "#E9E8F8",
        "sunset-peach": "#F5B69E",

        // Supporting Core Colors from new_design.md (with strong contrast)
        "deep-navy": "#17233B",
        "muted-slate": "#475569",
        "pure-white": "#FFFFFF",

        // Primary Brand Colors
        "primary": "#17233B",
        "primary-container": "#8DB9F0",
        "on-primary": "#17233B",
        "on-primary-container": "#17233B",
        "primary-fixed": "#8DB9F0",
        "primary-fixed-dim": "#73a5e6",
        "inverse-primary": "#17233B",

        // Secondary Accent Colors (Warm Sunset Peach #F5B69E)
        "secondary": "#D96D4B",
        "secondary-container": "#F5B69E",
        "on-secondary": "#17233B",
        "on-secondary-container": "#17233B",
        "secondary-fixed": "#F5B69E",
        "secondary-fixed-dim": "#e5a087",

        // Tertiary (Powder Blue)
        "tertiary": "#2563EB",
        "tertiary-container": "#DCE9F9",
        "on-tertiary": "#17233B",
        "on-tertiary-container": "#17233B",

        // Typography Mappings
        "on-surface": "#17233B",
        "on-surface-variant": "#475569",
        "on-background": "#17233B",
        "outline": "#64748B",
        "outline-variant": "rgba(255, 255, 255, 0.7)",

        // Status Alerts
        "error": "#DC2626",
        "error-container": "#FEE2E2",
        "on-error": "#FFFFFF",
        "on-error-container": "#991B1B",

        // Glassmorphism Surface Tokens
        "surface": "rgba(255, 255, 255, 0.85)",
        "surface-dim": "#EEF3FB",
        "surface-bright": "#FFFFFF",
        "surface-variant": "rgba(233, 232, 248, 0.85)",
        "surface-container-lowest": "#FFFFFF",
        "surface-container-low": "rgba(255, 255, 255, 0.75)",
        "surface-container": "rgba(255, 255, 255, 0.85)",
        "surface-container-high": "rgba(255, 255, 255, 0.95)",
        "surface-container-highest": "#FFFFFF",
      },
      boxShadow: {
        "glass": "0 10px 30px -5px rgba(23, 35, 59, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.8)",
        "glass-hover": "0 18px 40px -10px rgba(23, 35, 59, 0.14), 0 0 0 1px rgba(255, 255, 255, 0.95)",
        "glass-pill": "0 8px 24px -4px rgba(23, 35, 59, 0.09), 0 0 0 1px rgba(255, 255, 255, 0.85)",
        "glow-powder": "0 0 25px rgba(141, 185, 240, 0.45)",
        "glow-peach": "0 0 25px rgba(245, 182, 158, 0.5)",
      },
      borderRadius: {
        "DEFAULT": "0.5rem",
        "lg": "0.75rem",
        "xl": "1rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
        "4xl": "2.25rem",
        "full": "9999px"
      },
      fontFamily: {
        "sans": ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        "mono": ["JetBrains Mono", "monospace"],
      }
    }
  },
  plugins: [],
}
