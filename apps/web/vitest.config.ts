import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    dir: "./tests",
    reporters: ["verbose"],
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    testTimeout: 10000,
    env: {
      NEXT_PUBLIC_IS_DUB: "true",
    },
  },
});
