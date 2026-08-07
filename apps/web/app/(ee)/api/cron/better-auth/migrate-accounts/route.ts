import { qstash } from "@/lib/cron";
import { withCron } from "@/lib/cron/with-cron";
import { prisma } from "@/lib/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const BATCH_SIZE = 1000;
const ITERATIONS = 10;

// POST /api/cron/better-auth/migrate-accounts
export const POST = withCron(async () => {
  for (let i = 0; i < ITERATIONS; i++) {
    const count = await prisma.$executeRaw`
      UPDATE Account
      SET
        accountId = COALESCE(accountId, providerAccountId),
        providerId = COALESCE(providerId, provider),
        accessToken = COALESCE(accessToken, access_token),
        refreshToken = COALESCE(refreshToken, refresh_token)
      WHERE
        accountId IS NULL
        AND providerAccountId IS NOT NULL
      ORDER BY id
      LIMIT ${BATCH_SIZE}
    `;

    console.log(`Migrated ${count} accounts.`);

    if (count === 0) {
      return logAndRespond("Finished migrating accounts.");
    }
  }

  const qstashResponse = await qstash.publishJSON({
    method: "POST",
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/better-auth/migrate-accounts`,
    delay: "10s",
    retries: 0,
    flowControl: {
      key: "better-auth-migrate-accounts",
      parallelism: 1,
    },
  });

  return logAndRespond(
    `Scheduled next batch of accounts to migrate ${qstashResponse.messageId}`,
  );
});
