import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    dir: "./tests",
    reporters: ["verbose"],
    globals: true,
    testTimeout: 50000,
  },
});
