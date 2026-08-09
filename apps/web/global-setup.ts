import type { FullConfig } from "@playwright/test";
import { config as loadEnv } from "dotenv-flow";
import { setupTestWorkspace } from "./playwright/api/setup-test-workspace";

loadEnv({
  silent: true,
});

async function globalSetup(_config: FullConfig) {
  await setupTestWorkspace();
}

export default globalSetup;
