import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    dir: "./tests",
    reporters: ["verbose"],
    // outputFile: "./.vitest/html",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
  },
});
