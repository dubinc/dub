// @ts-ignore
import "dotenv-flow/config";

import { qstash } from "@/lib/cron";
import { prisma } from "@/lib/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";

async function main() {
  // await migrateUsers();
  // await migrateAccounts();
  // await migrateCredentials();
  await verifyMigration();
}

async function migrateUsers() {
  const qstashResponse = await qstash.publishJSON({
    method: "POST",
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/better-auth/migrate-users`,
    retries: 0,
    flowControl: {
      key: "better-auth-migrate-users",
      parallelism: 1,
    },
  });

  console.log(`migrateUsers executed: ${qstashResponse.messageId}`);
}

async function migrateAccounts() {
  const qstashResponse = await qstash.publishJSON({
    method: "POST",
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/better-auth/migrate-accounts`,
    retries: 0,
    flowControl: {
      key: "better-auth-migrate-accounts",
      parallelism: 1,
    },
  });

  console.log(`migrateAccounts executed: ${qstashResponse.messageId}`);
}

async function migrateCredentials() {
  const qstashResponse = await qstash.publishJSON({
    method: "POST",
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/better-auth/migrate-credentials`,
    retries: 0,
    flowControl: {
      key: "better-auth-migrate-credentials",
      parallelism: 1,
    },
  });

  console.log(`migrateCredentials executed: ${qstashResponse.messageId}`);
}

async function verifyMigration() {
  const [users, accounts, credentials] = await Promise.all([
    prisma.user.count({
      where: {
        emailVerified: {
          not: null,
        },
        emailVerifiedBa: false,
      },
    }),

    prisma.account.count({
      where: {
        accountId: null,
        providerAccountId: {
          not: null,
        },
      },
    }),

    prisma.user.count({
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
    }),
  ]);

  const ok = users === 0 && accounts === 0 && credentials === 0;

  console.log(
    ok
      ? "Better Auth migration complete."
      : "Better Auth migration incomplete.",
    {
      users,
      accounts,
      credentials,
    },
  );

  if (!ok) {
    process.exit(1);
  }
}

main();
