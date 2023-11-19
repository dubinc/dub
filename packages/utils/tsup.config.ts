import { defineConfig, Options } from "tsup";

export default defineConfig((options: Options) => ({
  entry: ["src/**/*.ts"],
  format: ["esm"],
  dts: true,
  minify: true,
  external: ["react"],
  ...options,
}));
