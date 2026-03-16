import "dotenv-flow/config";

import type { FullConfig } from "@playwright/test";

async function globalSetup(_config: FullConfig) {}

export default globalSetup;
