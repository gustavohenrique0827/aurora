import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        jarvis: {
          bg: "#05070d",
          panel: "rgba(15, 22, 38, 0.55)",
          // Nested/secondary surface inside a GlassPanel (stat tiles, list rows) — one tier
          // lighter than jarvis.panel so hierarchy reads without a new component variant.
          surface: "rgba(255, 255, 255, 0.03)",
          surfaceHover: "rgba(255, 255, 255, 0.06)",
          border: "rgba(90, 200, 255, 0.18)",
          borderBright: "rgba(90, 200, 255, 0.4)",
          cyan: "#4fd7ff",
          cyanBright: "#8ff3ff",
          amber: "#ffb454",
          red: "#ff5c7a",
          green: "#5cffb0",
        },
      },
      boxShadow: {
        glow: "0 0 24px rgba(79, 215, 255, 0.35)",
        glowSoft: "0 0 12px rgba(79, 215, 255, 0.2)",
        glowRed: "0 0 16px rgba(255, 92, 122, 0.3)",
        glowGreen: "0 0 16px rgba(92, 255, 176, 0.3)",
        glowAmber: "0 0 16px rgba(255, 180, 84, 0.3)",
      },
      backdropBlur: {
        xs: "2px",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        // Idle "breathing" for HUD chrome/badges that represent a live, waiting system —
        // communicates "alive, listening" without implying new information arrived.
        breathe: {
          "0%, 100%": { opacity: "0.5", transform: "scale(1)" },
          "50%": { opacity: "0.85", transform: "scale(1.03)" },
        },
        // Slow full rotation for radar/scan chrome — direction-neutral, so it reads as
        // "monitoring" rather than "loading" (which uses a faster, directional spinner).
        radarSpin: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        pulseGlow: "pulseGlow 2.4s ease-in-out infinite",
        breathe: "breathe 3.6s ease-in-out infinite",
        radarSpin: "radarSpin 8s linear infinite",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
} satisfies Config;
