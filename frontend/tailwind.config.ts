import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "sans-serif"],
        heading: ["'Space Grotesk'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      colors: {
        ink: {
          950: "rgb(var(--color-ink-950) / <alpha-value>)",
          900: "rgb(var(--color-ink-900) / <alpha-value>)",
          800: "rgb(var(--color-ink-800) / <alpha-value>)",
          700: "rgb(var(--color-ink-700) / <alpha-value>)",
        },
        teal: {
          500: "rgb(var(--color-teal-500) / <alpha-value>)",
          400: "rgb(var(--color-teal-400) / <alpha-value>)",
        },
        coral: {
          500: "rgb(var(--color-coral-500) / <alpha-value>)",
          400: "rgb(var(--color-coral-400) / <alpha-value>)",
        },
        amber: {
          500: "rgb(var(--color-amber-500) / <alpha-value>)",
          400: "rgb(var(--color-amber-400) / <alpha-value>)",
        },
        success: {
          500: "rgb(var(--color-success-500) / <alpha-value>)",
        },
        danger: {
          500: "rgb(var(--color-danger-500) / <alpha-value>)",
        },
        surface: {
          1: "rgb(var(--surface-1) / <alpha-value>)",
          2: "rgb(var(--surface-2) / <alpha-value>)",
          3: "rgb(var(--surface-3) / <alpha-value>)",
          4: "rgb(var(--surface-4) / <alpha-value>)",
        },
        text: {
          base: "rgb(var(--text-base) / <alpha-value>)",
          muted: "rgb(var(--text-muted) / <alpha-value>)",
          soft: "rgb(var(--text-soft) / <alpha-value>)",
        },
        border: {
          DEFAULT: "rgb(var(--border-color) / <alpha-value>)",
          strong: "rgb(var(--border-strong) / <alpha-value>)",
        },
        accent: "rgb(var(--accent-rgb) / <alpha-value>)",
      },
      boxShadow: {
        glow: "0 0 0 1px rgb(var(--accent-rgb) / 0.2), 0 16px 48px rgb(var(--accent-rgb) / 0.12)",
        panel: "0 20px 80px rgb(5 10 25 / 0.35)",
      },
      backgroundImage: {
        "panel-gradient":
          "linear-gradient(160deg, rgb(var(--surface-2)) 0%, rgb(var(--surface-1)) 45%, rgb(var(--surface-3)) 100%)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.55", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.06)" },
        },
      },
      animation: {
        float: "float 8s ease-in-out infinite",
        pulseSoft: "pulseSoft 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
