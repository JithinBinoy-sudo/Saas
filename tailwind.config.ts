import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "#0e0e10",
        foreground: "#f9f5f8",
        primary: {
          DEFAULT: "#85adff",
          foreground: "#000000",
          container: "#6e9fff",
          dim: "#699cff",
          fixed: "#6e9fff",
          "fixed-dim": "#5391ff",
        },
        secondary: {
          DEFAULT: "#c180ff",
          foreground: "hsl(var(--secondary-foreground))",
          container: "#6f00be",
          dim: "#9c48ea",
          fixed: "#e5c6ff",
          "fixed-dim": "#dbb4ff",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        error: "#ff6e84",
        "tertiary-container": "#00cffc",
        "surface-container-lowest": "#000000",
        "tertiary-fixed": "#00cffc",
        "on-primary-fixed-variant": "#002a62",
        "surface-bright": "#2c2c2f",
        "on-tertiary-fixed": "#002a35",
        "on-background": "#f9f5f8",
        "on-secondary-fixed-variant": "#7511c3",
        "on-surface": "#f9f5f8",
        "on-primary-container": "#002150",
        "error-container": "#a70138",
        "on-primary": "#002c66",
        "surface-container-low": "#131315",
        "on-surface-variant": "#adaaad",
        "on-error": "#490013",
        "on-secondary-fixed": "#4f0089",
        "on-tertiary-fixed-variant": "#004a5c",
        "outline-variant": "#48474a",
        "surface-container": "#19191c",
        "surface-dim": "#0e0e10",
        "inverse-on-surface": "#565457",
        "on-secondary-container": "#e9cdff",
        tertiary: {
          DEFAULT: "#69daff",
          dim: "#00c0ea",
        },
        outline: "#767577",
        "on-error-container": "#ffb2b9",
        "on-secondary": "#33005b",
        "on-tertiary-container": "#004050",
        "surface-container-high": "#1f1f22",
        "inverse-primary": "#005bc4",
        "on-tertiary": "#004a5d",
        surface: {
          DEFAULT: "#0e0e10",
        },
        "inverse-surface": "#fcf8fb",
        "error-dim": "#d73357",
        "surface-variant": "#262528",
        "surface-tint": "#85adff",
        "on-primary-fixed": "#000000",
        "surface-container-highest": "#262528"
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        headline: ["Inter", "sans-serif"],
        body: ["Inter", "sans-serif"],
        label: ["Inter", "sans-serif"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
