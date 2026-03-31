import { defineConfig, Options } from "tsup";

export default defineConfig((options: Options) => ({
  entry: ["src/**/*.ts"],
  format: ["esm"],
  dts: true,
  minify: true,
  clean: process.env.VERCEL === "1",
  external: ["react"],
  ...options,
}));
