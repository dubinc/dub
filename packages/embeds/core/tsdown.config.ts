import { defineConfig } from "tsdown";

export default defineConfig((options) => ({
  entry: {
    "embed/script": "src/embed.ts", // Standalone entry for embed.ts
    index: "src/index.ts", // Entry for all other files via index.ts
  },
  format: ["esm"],
  dts: true,
  minify: true,
  clean: true,
  splitting: false,
  ...options,
}));
