import { defineConfig } from "tsdown";

export default defineConfig((options) => ({
  entry: {
    index: "src/index.tsx",
    "icons/index": "src/icons/index.tsx",
    "charts/index": "src/charts/index.ts",
  },

  format: ["esm"],
  dts: true,
  minify: true,
  external: ["react"],
  ...options,
}));
