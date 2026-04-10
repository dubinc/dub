import "dotenv-flow/config";

import type { FullConfig } from "@playwright/test";
import { execSync } from "child_process";

async function globalSetup(_config: FullConfig) {
  // Seed workspaces + programs (from dev seed JSON files) — CI only; local dev assumes seeded DB
  if (process.env.GITHUB_ACTION) {
    execSync("npx tsx scripts/dev/seed.ts -w acme", {
      stdio: "inherit",
      cwd: __dirname,
    });

    execSync("npx tsx scripts/dev/seed.ts -w example", {
      stdio: "inherit",
      cwd: __dirname,
    });
  }

  // Seed existing partner test user
  execSync("npx tsx playwright/seed.ts", {
    stdio: "inherit",
    cwd: __dirname,
  });
}

export default globalSetup;
