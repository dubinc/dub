import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    "embed/script": "src/embed.ts", // Standalone entry for embed.ts
    index: "src/index.ts", // Entry for all other files via index.ts
  },
  format: ["cjs"],
  esbuildOptions(options) {
    options.banner = {
      js: '"use client"',
    };
  },
  dts: true,
  minify: true,
  clean: true,
  splitting: false,
});
