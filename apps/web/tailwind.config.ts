import sharedConfig from "@dub/tailwind-config/tailwind.config";
import type { Config } from "tailwindcss";

const config: Pick<Config, "presets"> = {
  presets: [
    {
      ...sharedConfig,
      content: [
        "./app/**/*.{js,ts,jsx,tsx}",
        "./ui/**/*.{js,ts,jsx,tsx}",
        "../../packages/ui/src/**/*{.js,.ts,.jsx,.tsx}",
        "../../packages/blocks/src/**/*{.js,.ts,.jsx,.tsx}",
      ],
      theme: {
        extend: {
          ...sharedConfig?.theme?.extend,
          colors: {
            primary: {
              DEFAULT: "#006666",
              100: "#F8FCFC",
              200: "#F2F7F7",
              300: "#DBF2F2",
              800: "#004D4D",
            },
            secondary: {
              DEFAULT: "#0066CC",
              100: "#E6F0FF",
              800: "#0052A3",
              text: "#1E293B",
              textMuted: "#2C3345",
            },
            neutral: {
              DEFAULT: "#212121",
              100: "#F6F6F7",
              200: "#6E7275",
              300: "#424242",
              400: "#799290",
              900: "#121620",
            },
            border: {
              DEFAULT: "#D9E7FF",
              100: "#F0F2F5",
              200: "#E2E2E3",
            },
          },
          backgroundImage: {
            "qr-gradient":
              "linear-gradient(90deg, #115740 44.41%, #25BD8B 83.62%)",
          },
          animation: {
            ...sharedConfig?.theme?.extend?.animation,
            "infinite-scroll": "infinite-scroll 22s linear infinite",
            "infinite-scroll-y": "infinite-scroll-y 22s linear infinite",
            "scrolling-banner":
              "scrolling-banner var(--duration) linear infinite",
            "scrolling-banner-vertical":
              "scrolling-banner-vertical var(--duration) linear infinite",
            "text-appear": "text-appear 0.15s ease",
            "table-pinned-shadow":
              "table-pinned-shadow cubic-bezier(0, 0, 1, 0)",
            "caret-blink": "caret-blink 1s ease-out infinite",
            "pulse-scale": "pulse-scale 6s ease-out infinite",
            "gradient-move": "gradient-move 5s linear infinite",
          },
          keyframes: {
            ...sharedConfig?.theme?.extend?.keyframes,
            "infinite-scroll": {
              "0%": { transform: "translateX(0)" },
              "100%": { transform: "translateX(var(--scroll, -150%))" },
            },
            "infinite-scroll-y": {
              "0%": { transform: "translateY(0)" },
              "100%": { transform: "translateY(var(--scroll, -150%))" },
            },
            "scrolling-banner": {
              from: { transform: "translateX(0)" },
              to: { transform: "translateX(calc(-50% - var(--gap) / 2))" },
            },
            "scrolling-banner-vertical": {
              from: { transform: "translateY(0)" },
              to: { transform: "translateY(calc(-50% - var(--gap) / 2))" },
            },
            "text-appear": {
              "0%": {
                opacity: "0",
                transform: "rotateX(45deg) scale(0.95)",
              },
              "100%": {
                opacity: "1",
                transform: "rotateX(0deg) scale(1)",
              },
            },
            "table-pinned-shadow": {
              "0%": { filter: "drop-shadow(rgba(0, 0, 0, 0.1) -2px 10px 6px)" },
              "100%": { filter: "drop-shadow(rgba(0, 0, 0, 0) -2px 10px 6px)" },
            },
            "caret-blink": {
              "0%,70%,100%": { opacity: "0" },
              "20%,50%": { opacity: "1" },
            },
            "pulse-scale": {
              "0%": { transform: "scale(0.8)", opacity: "0" },
              "30%": { opacity: "1" },
              "100%": { transform: "scale(2)", opacity: "0" },
            },
            "gradient-move": {
              "0%": { backgroundPosition: "0% 50%" },
              "100%": { backgroundPosition: "200% 50%" },
            },
          },
        },
      },
    },
  ],
};

export default config;
