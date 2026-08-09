import { config as loadEnv } from "dotenv-flow";
import type { FullConfig } from "@playwright/test";
import { setupTestWorkspace } from "./playwright/api/setup-test-workspace";

loadEnv();

async function globalSetup(_config: FullConfig) {
  await setupTestWorkspace();
}

export default globalSetup;
