import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // MIZAN reads these from CSS variables set at runtime by the root
        // layout (from settings), so an operator's chosen brand colours apply
        // everywhere with no rebuild — same mechanism as ECIRS. Fallbacks keep
        // a distinct default palette (deep indigo + amber) so MIZAN and ECIRS
        // are visually distinguishable out of the box.
        brand: {
          DEFAULT: "var(--brand, #1E3A5F)",
          deep: "var(--brand-deep, #12243B)",
          mist: "var(--brand-mist, #E6ECF3)",
        },
        accent: {
          DEFAULT: "var(--accent, #C77D1A)",
          soft: "var(--accent-soft, #F6E9D2)",
        },
        paper: "#FAFAF8",
        ink: "#1B1B19",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
