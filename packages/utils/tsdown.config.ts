import { defineConfig } from "tsdown";

export default defineConfig((options) => ({
  entry: ["src/**/*.ts"],
  format: ["esm"],
  dts: true,
  minify: true,
  external: ["react"],
  ...options,
}));
