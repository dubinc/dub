import forms from "@tailwindcss/forms";
import typography from "@tailwindcss/typography";
import scrollbarHide from "tailwind-scrollbar-hide";
import type { Config } from "tailwindcss";
import radix from "tailwindcss-radix";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  future: {
    hoverOnlyWhenSupported: true,
  },
  theme: {
    extend: {
      screens: {
        xs: "420px",
      },
      typography: {
        DEFAULT: {
          css: {
            "blockquote p:first-of-type::before": { content: "none" },
            "blockquote p:first-of-type::after": { content: "none" },
          },
        },
      },
      fontFamily: {
        display: ["var(--font-satoshi)", "system-ui", "sans-serif"],
        default: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: [
          "var(--font-geist-mono, ui-monospace)",
          "ui-monospace",
          "monospace",
        ],
      },
      fontSize: {
        "2xs": [
          "0.625rem",
          {
            lineHeight: "0.875rem",
          },
        ],
      },
      animation: {
        // Modal
        "scale-in": "scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-in": "fade-in 0.2s ease-out forwards",
        "scale-in-fade": "scale-in-fade 0.2s ease-out forwards",
        // Popover, Tooltip
        "slide-up-fade": "slide-up-fade 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-right-fade":
          "slide-right-fade 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-down-fade": "slide-down-fade 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-left-fade": "slide-left-fade 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        // Sheet
        "slide-in-from-right": "slide-in-from-right 0.2s ease",
        "slide-out-to-right": "slide-out-to-right 0.2s ease",
        // Navigation menu
        "enter-from-right": "enter-from-right 0.15s ease",
        "enter-from-left": "enter-from-left 0.15s ease",
        "exit-to-right": "exit-to-right 0.15s ease",
        "exit-to-left": "exit-to-left 0.15s ease",
        "scale-in-content": "scale-in-content 0.2s ease",
        "scale-out-content": "scale-out-content 0.2s ease",
        // Accordion
        "accordion-down": "accordion-down 300ms cubic-bezier(0.87, 0, 0.13, 1)",
        "accordion-up": "accordion-up 300ms cubic-bezier(0.87, 0, 0.13, 1)",
        // Custom wiggle animation
        wiggle: "wiggle 0.75s infinite",
        // Custom spinner animation (for loading-spinner)
        spinner: "spinner 1.2s linear infinite",
        // Custom blink animation (for loading-dots)
        blink: "blink 1.4s infinite both",
        // Custom pulse animation
        pulse: "pulse 1s linear infinite alternate",
      },
      keyframes: {
        // Modal
        "scale-in": {
          "0%": { transform: "scale(0.95)" },
          "100%": { transform: "scale(1)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in-fade": {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        // Popover, Tooltip
        "slide-up-fade": {
          "0%": { opacity: "0", transform: "translateY(var(--offset, 2px))" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-right-fade": {
          "0%": { opacity: "0", transform: "translateX(var(--offset, -2px))" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "slide-down-fade": {
          "0%": { opacity: "0", transform: "translateY(var(--offset, -2px))" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-left-fade": {
          "0%": { opacity: "0", transform: "translateX(var(--offset, 2px))" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        // Sheet
        "slide-in-from-right": {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        "slide-out-to-right": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(100%)" },
        },
        // Navigation menu
        "enter-from-right": {
          "0%": { transform: "translateX(200px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "enter-from-left": {
          "0%": { transform: "translateX(-200px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "exit-to-right": {
          "0%": { transform: "translateX(0)", opacity: "1" },
          "100%": { transform: "translateX(200px)", opacity: "0" },
        },
        "exit-to-left": {
          "0%": { transform: "translateX(0)", opacity: "1" },
          "100%": { transform: "translateX(-200px)", opacity: "0" },
        },
        "scale-in-content": {
          "0%": { transform: "rotateX(-30deg) scale(0.9)", opacity: "0" },
          "100%": { transform: "rotateX(0deg) scale(1)", opacity: "1" },
        },
        "scale-out-content": {
          "0%": { transform: "rotateX(0deg) scale(1)", opacity: "1" },
          "100%": { transform: "rotateX(-10deg) scale(0.95)", opacity: "0" },
        },
        // Accordion
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        // Custom wiggle animation
        wiggle: {
          "0%, 100%": {
            transform: "translateX(0%)",
            transformOrigin: "50% 50%",
          },
          "15%": { transform: "translateX(-4px) rotate(-4deg)" },
          "30%": { transform: "translateX(6px) rotate(4deg)" },
          "45%": { transform: "translateX(-6px) rotate(-2.4deg)" },
          "60%": { transform: "translateX(2px) rotate(1.6deg)" },
          "75%": { transform: "translateX(-1px) rotate(-0.8deg)" },
        },
        // Custom spinner animation (for loading-spinner)
        spinner: {
          "0%": {
            opacity: "1",
          },
          "100%": {
            opacity: "0",
          },
        },
        // Custom blink animation (for loading-dots)
        blink: {
          "0%": {
            opacity: "0.2",
          },
          "20%": {
            opacity: "1",
          },
          "100%": {
            opacity: "0.2",
          },
        },
        // Custom pulse animation
        pulse: {
          from: {
            opacity: "0",
          },
          to: {
            opacity: "1",
          },
        },
      },
      colors: {
        brown: {
          50: "#fdf8f6",
          100: "#f2e8e5",
          200: "#eaddd7",
          300: "#e0cec7",
          400: "#d2bab0",
          500: "#bfa094",
          600: "#a18072",
          700: "#977669",
          800: "#846358",
          900: "#43302b",
        },

        // Light/dark mode colors

        "bg-emphasis": "rgb(var(--bg-emphasis, 229 229 229) / <alpha-value>)",
        "bg-default": "rgb(var(--bg-default, 255 255 255) / <alpha-value>)",
        "bg-subtle": "rgb(var(--bg-subtle, 245 245 245) / <alpha-value>)",
        "bg-muted": "rgb(var(--bg-muted, 250 250 250) / <alpha-value>)",
        "bg-inverted": "rgb(var(--bg-inverted, 23 23 23) / <alpha-value>)",

        "bg-info": "rgb(var(--bg-info, 191 219 254) / <alpha-value>)",
        "bg-success": "rgb(var(--bg-success, 220 252 231) / <alpha-value>)",
        "bg-attention": "rgb(var(--bg-attention, 255 237 213) / <alpha-value>)",
        "bg-error": "rgb(var(--bg-error, 254 226 226) / <alpha-value>)",

        "border-emphasis":
          "rgb(var(--border-emphasis, 163 163 163) / <alpha-value>)",
        "border-default":
          "rgb(var(--border-default, 212 212 212) / <alpha-value>)",
        "border-subtle":
          "rgb(var(--border-subtle, 229 229 229) / <alpha-value>)",
        "border-muted": "rgb(var(--border-muted, 245 245 245) / <alpha-value>)",

        "content-inverted":
          "rgb(var(--content-inverted, 255 255 255) / <alpha-value>)",
        "content-muted":
          "rgb(var(--content-muted, 163 163 163) / <alpha-value>)",
        "content-subtle":
          "rgb(var(--content-subtle, 115 115 115) / <alpha-value>)",
        "content-default":
          "rgb(var(--content-default, 64 64 64) / <alpha-value>)",
        "content-emphasis":
          "rgb(var(--content-emphasis, 23 23 23) / <alpha-value>)",

        "content-info": "rgb(var(--content-info, 29 78 216) / <alpha-value>)",
        "content-success":
          "rgb(var(--content-success, 21 128 61) / <alpha-value>)",
        "content-attention":
          "rgb(var(--content-attention, 194 65 12) / <alpha-value>)",
        "content-error": "rgb(var(--content-error, 185 28 28) / <alpha-value>)",
      },
      dropShadow: {
        "card-hover": ["0 8px 12px #222A350d", "0 32px 80px #2f30370f"],
      },
    },
  },
  plugins: [forms, typography, scrollbarHide, radix],
};

export default config;
