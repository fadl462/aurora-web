import type { Config } from "tailwindcss";

// These values are the implementation of docs/08-ui-ux-design-system.md
// in aurora-ai-os. If a token changes here, update that doc too —
// they're required to stay in sync.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0B0D12",
        surface: "#12151C",
        "surface-raised": "#171B24",
        "surface-hover": "#1D222D",
        border: {
          DEFAULT: "#262B36",
          soft: "#1D222D",
        },
        text: {
          DEFAULT: "#E7E9EE",
          muted: "#8B93A7",
          faint: "#565D6E",
        },
        aurora: {
          1: "#4CE0B3",
          2: "#5B8CFF",
          3: "#B37FFF",
          4: "#FF6FA8",
        },
        accent: "#5B8CFF",
        success: "#4CE0B3",
        warning: "#E0B34C",
        danger: "#FF6FA8",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "16px",
      },
      keyframes: {
        "aurora-shift": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "msg-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "aurora-shift": "aurora-shift 8s ease-in-out infinite",
        "msg-in": "msg-in 0.25s ease-out",
      },
    },
  },
  plugins: [],
};
export default config;
