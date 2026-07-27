import type { Config } from "tailwindcss";

// These values are the implementation of docs/08-ui-ux-design-system.md
// in aurora-ai-os. If a token changes here, update that doc too —
// they're required to stay in sync.

// Wraps a CSS custom property (defined in globals.css per data-theme)
// so Tailwind's opacity modifiers (bg-surface/50, border-border/40)
// keep working even though the underlying color now swaps with the
// active theme instead of being a fixed hex value.
//
// Tailwind's own TS types don't model function-valued colors even
// though the JIT engine fully supports them at runtime — this is a
// known, documented gap, not a real type error. `as unknown as string`
// tells TypeScript what it needs to hear for Config's shape while the
// actual runtime value (a function) is what Tailwind's JS actually
// consumes.
function withOpacity(variableName: string): string {
  return ((({ opacityValue }: { opacityValue?: string }) => {
    if (opacityValue !== undefined) {
      return `rgb(var(${variableName}) / ${opacityValue})`;
    }
    return `rgb(var(${variableName}))`;
  }) as unknown) as string;
}

const config: Config = {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Theme-dependent — see globals.css for the actual dark/light
        // values behind these CSS variables.
        bg: withOpacity("--color-bg"),
        surface: withOpacity("--color-surface"),
        "surface-raised": withOpacity("--color-surface-raised"),
        "surface-hover": withOpacity("--color-surface-hover"),
        border: {
          DEFAULT: withOpacity("--color-border"),
          soft: withOpacity("--color-border-soft"),
          hover: withOpacity("--color-border-hover"),
        },
        text: {
          DEFAULT: withOpacity("--color-text"),
          muted: withOpacity("--color-text-muted"),
          faint: withOpacity("--color-text-faint"),
        },
        // Brand accents — deliberately NOT theme-dependent. See the
        // comment in globals.css for why.
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
