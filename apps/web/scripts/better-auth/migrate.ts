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
  const [
    usersPending,
    accountsPending,
    accountsMismatched,
    credentialsPending,
    credentialsMismatched,
  ] = await Promise.all([
    prisma.user.count({
      where: {
        emailVerified: {
          not: null,
        },
        emailVerifiedBa: false,
      },
    }),

    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) AS count
      FROM Account
      WHERE
        (providerAccountId IS NOT NULL AND accountId IS NULL)
        OR (provider IS NOT NULL AND providerId IS NULL)
        OR (access_token IS NOT NULL AND accessToken IS NULL)
        OR (refresh_token IS NOT NULL AND refreshToken IS NULL)
    `.then((rows) => Number(rows[0].count)),

    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) AS count
      FROM Account
      WHERE
        (providerAccountId IS NOT NULL AND accountId IS NOT NULL AND accountId != providerAccountId)
        OR (provider IS NOT NULL AND providerId IS NOT NULL AND providerId != provider)
        OR (access_token IS NOT NULL AND accessToken IS NOT NULL AND accessToken != access_token)
        OR (refresh_token IS NOT NULL AND refreshToken IS NOT NULL AND refreshToken != refresh_token)
    `.then((rows) => Number(rows[0].count)),

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

    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) AS count
      FROM Account a
      INNER JOIN User u ON u.id = a.userId
      WHERE
        a.providerId = 'credential'
        AND (
          a.accountId != a.userId
          OR a.password IS NULL
          OR (u.passwordHash IS NOT NULL AND a.password != u.passwordHash)
        )
    `.then((rows) => Number(rows[0].count)),
  ]);

  const pending = {
    users: usersPending,
    accounts: accountsPending,
    credentials: credentialsPending,
  };

  const mismatched = {
    accounts: accountsMismatched,
    credentials: credentialsMismatched,
  };

  const ok =
    usersPending === 0 &&
    accountsPending === 0 &&
    accountsMismatched === 0 &&
    credentialsPending === 0 &&
    credentialsMismatched === 0;

  console.log(
    ok
      ? "Better Auth migration complete."
      : "Better Auth migration incomplete.",
    { pending, mismatched },
  );

  if (!ok) {
    process.exit(1);
  }
}

main();
