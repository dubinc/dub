import { defineConfig } from "tsdown";

export default defineConfig((options) => ({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  esbuildOptions(options: any) {
    options.banner = {
      js: '"use client"',
    };
  },
  outExtension({ format }: any) {
    return {
      js: format === "esm" ? ".mjs" : ".js",
    };
  },
  dts: true,
  minify: true,
  external: ["react"],
  noExternal: ["@dub/embed-core"],
  clean: true,
  splitting: false,
  ...options,
}));
