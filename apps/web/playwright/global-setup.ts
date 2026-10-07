import type { FullConfig } from "@playwright/test";
import { config as loadEnv } from "dotenv-flow";
import { setupTestWorkspace } from "./api/setup-test-workspace";
import { assertLocalDatabaseEnv } from "./assert-local-database";

loadEnv({
  silent: true,
});

async function globalSetup(_config: FullConfig) {
  assertLocalDatabaseEnv();
  await setupTestWorkspace();
}

export default globalSetup;
