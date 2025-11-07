import { defineConfig } from "tsdown";

export default defineConfig((options) => ({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  minify: true,
  external: ["react"],
  noExternal: ["@dub/embed-core"],
  clean: true,
  splitting: false,
  ...options,
}));
