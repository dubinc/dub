import sharedConfig from "@dub/tailwind-config/tailwind.config";
import type { Config } from "tailwindcss";

const config: Pick<Config, "presets"> = {
  presets: [
    {
      ...sharedConfig,
      content: [
        "./app/**/*.{js,ts,jsx,tsx}",
        "./ui/**/*.{js,ts,jsx,tsx}",
        // h/t to https://www.willliu.com/blog/Why-your-Tailwind-styles-aren-t-working-in-your-Turborepo
        "../../packages/ui/src/**/*{.js,.ts,.jsx,.tsx}",
        "../../packages/blocks/src/**/*{.js,.ts,.jsx,.tsx}",
      ],
      theme: {
        extend: {
          ...sharedConfig?.theme?.extend,
          animation: {
            ...sharedConfig?.theme?.extend?.animation,
            // Infinite scroll animation
            "infinite-scroll": "infinite-scroll 22s linear infinite",
            "infinite-scroll-y": "infinite-scroll-y 22s linear infinite",
            // Text appear animation
            "text-appear": "text-appear 0.15s ease",
            // Table pinned column shadow animation
            "table-pinned-shadow":
              "table-pinned-shadow cubic-bezier(0, 0, 1, 0)",
            // OTP caret blink animation
            "caret-blink": "caret-blink 1s ease-out infinite",
            // Pulse scale animation used for onboarding/welcome
            "pulse-scale": "pulse-scale 6s ease-out infinite",
            "gradient-move": "gradient-move 5s linear infinite",
          },
          keyframes: {
            ...sharedConfig?.theme?.extend?.keyframes,
            // Infinite scroll animation
            "infinite-scroll": {
              "0%": { transform: "translateX(0)" },
              "100%": { transform: "translateX(-150%)" },
            },
            "infinite-scroll-y": {
              "0%": { transform: "translateY(0)" },
              "100%": { transform: "translateY(var(--scroll, -150%))" },
            },
            // Text appear animation
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
            // Table pinned column shadow animation
            "table-pinned-shadow": {
              "0%": { filter: "drop-shadow(rgba(0, 0, 0, 0.1) -2px 10px 6px)" },
              "100%": { filter: "drop-shadow(rgba(0, 0, 0, 0) -2px 10px 6px)" },
            },
            // OTP caret blink animation
            "caret-blink": {
              "0%,70%,100%": { opacity: "0" },
              "20%,50%": { opacity: "1" },
            },
            // Pulse scale animation used for onboarding/welcome
            "pulse-scale": {
              "0%": { transform: "scale(0.8)", opacity: "0" },
              "30%": { opacity: "1" },
              "100%": { transform: "scale(2)", opacity: "0" },
            },
            // Gradient move animation for gradient text
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
