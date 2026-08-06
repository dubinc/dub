// @ts-expect-error
import "dotenv-flow/config";

/**
 * Kicks off the NextAuth → Better Auth account column migration cron.
 *
 * The cron processes 500 accounts per run (5 × 100 in parallel), then
 * requeues itself via QStash until all pre-MIGRATION_DATE rows are done.
 *
 *   pnpm exec dotenv-flow -e .env -- tsx scripts/better-auth/migrate-nextauth-account-columns.ts
 */

import { qstash } from "@/lib/cron";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";

async function main() {
  const url = `${APP_DOMAIN_WITH_NGROK}/api/cron/better-auth/migrate-nextauth-accounts`;

  const response = await qstash.publishJSON({
    url,
    method: "POST",
    body: {},
  });

  console.log(`Queued migration cron: ${url}`, response);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
