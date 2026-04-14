import { defineConfig, Options } from "tsup";

export default defineConfig((options: Options) => ({
  entry: {
    index: "src/index.tsx",
    "icons/index": "src/icons/index.tsx",
    "charts/index": "src/charts/index.ts",
  },
  format: ["esm"],
  esbuildOptions(options) {
    options.banner = {
      js: '"use client"',
    };
  },
  dts: true,
  minify: true,
  clean: process.env.VERCEL === "1",
  external: ["react"],
  ...options,
}));
