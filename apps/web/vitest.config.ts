import { loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";
import { VITEST_TEST_TIMEOUT_MS } from "./lib/constants/misc";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    dir: "./tests",
    reporters: ["verbose"],
    globals: true,
    testTimeout: VITEST_TEST_TIMEOUT_MS,
    env: loadEnv("", process.cwd(), ""),
    setupFiles: ["./tests/setupTests.ts"],
  },
});
