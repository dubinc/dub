import { qstash } from "@/lib/cron";
import { withCron } from "@/lib/cron/with-cron";
import { prisma } from "@/lib/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BATCH_SIZE = 1000;
const ITERATIONS = 10;

// POST /api/cron/better-auth/migrate-credentials
export const POST = withCron(async () => {
  for (let i = 0; i < ITERATIONS; i++) {
    const users = await prisma.user.findMany({
      where: {
        passwordHash: {
          not: null,
        },
        accounts: {
          none: {
            providerId: "credential",
          },
        },
      },
      select: {
        id: true,
        passwordHash: true,
      },
      orderBy: {
        id: "asc",
      },
      take: BATCH_SIZE,
    });

    if (users.length === 0) {
      return logAndRespond("Finished migrating credentials.");
    }

    const { count } = await prisma.account.createMany({
      skipDuplicates: true,
      data: users.map((user) => ({
        userId: user.id,
        accountId: user.id,
        providerId: "credential",
        password: user.passwordHash,
      })),
    });

    console.log(`Migrated ${count} credentials.`);

    // No rows inserted while candidates remain means the batch cannot progress.
    if (count === 0) {
      return logAndRespond(
        `Stopped migrating credentials: ${users.length} users matched but no accounts were created.`,
        { logLevel: "error" },
      );
    }
  }

  const qstashResponse = await qstash.publishJSON({
    method: "POST",
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/better-auth/migrate-credentials`,
    delay: "10s",
    retries: 0,
    flowControl: {
      key: "better-auth-migrate-credentials",
      parallelism: 1,
    },
  });

  return logAndRespond(
    `Scheduled next batch of credentials to migrate ${qstashResponse.messageId}`,
  );
});
