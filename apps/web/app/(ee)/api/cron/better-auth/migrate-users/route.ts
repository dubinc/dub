import { qstash } from "@/lib/cron";
import { withCron } from "@/lib/cron/with-cron";
import { prisma } from "@/lib/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const BATCH_SIZE = 1000;
const ITERATIONS = 10;

// POST /api/cron/better-auth/migrate-users
export const POST = withCron(async () => {
  let totalUpdated = 0;

  for (let i = 0; i < ITERATIONS; i++) {
    const { count } = await prisma.user.updateMany({
      where: {
        emailVerified: {
          not: null,
        },
        emailVerifiedBa: false,
      },
      data: {
        emailVerifiedBa: true,
      },
      limit: BATCH_SIZE,
    });

    totalUpdated += count;

    if (count === 0) {
      return logAndRespond("Finished migrating users.");
    }
  }

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

  return logAndRespond(
    `Scheduled next batch of users to migrate ${qstashResponse.messageId}`,
  );
});
