// @ts-ignore
import "dotenv-flow/config";

import { qstash } from "@/lib/cron";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";

async function main() {
  await migrateUsers();
}

async function migrateUsers() {
  const qstashResponse = await qstash.publishJSON({
    method: "POST",
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/better-auth/migrate-users`,
    delay: "10s",
    retries: 0,
    flowControl: {
      key: "better-auth-migrate-users",
      parallelism: 1,
    },
  });

  console.log(`migrateUsers executed: ${qstashResponse.messageId}`);
}

main();
