// @ts-expect-error
import "dotenv-flow/config";

/**
 * Copies NextAuth legacy Account columns into Better Auth columns.
 *
 * Mapping:
 *   provider            → providerId
 *   providerAccountId   → accountId
 *   access_token        → accessToken
 *   refresh_token       → refreshToken
 *   expires_at (unix)   → accessTokenExpiresAt
 *
 * Only fills Better Auth fields when they are null/empty.
 * Does not clear NextAuth legacy columns.
 * Processes accounts with createdAt < MIGRATION_DATE, in batches with a delay.
 *
 *   pnpm exec dotenv-flow -e .env -- tsx scripts/better-auth/migrate-nextauth-account-columns.ts
 */

import { prisma } from "@/lib/prisma";
import { Account } from "@prisma/client";

const BATCH_SIZE = 100;
const BATCH_DELAY_MS = 1_000;
// Accounts created before this date are treated as NextAuth-era rows.
const MIGRATION_DATE = new Date("2026-08-06T00:00:00.000Z");

type AccountRow = Pick<
  Account,
  | "id"
  | "provider"
  | "providerAccountId"
  | "access_token"
  | "refresh_token"
  | "expires_at"
  | "accountId"
  | "providerId"
  | "accessToken"
  | "refreshToken"
  | "accessTokenExpiresAt"
>;

function needsMigration(row: AccountRow) {
  const missingProviderId =
    !!row.provider && (!row.providerId || row.providerId.length === 0);
  const missingAccountId =
    !!row.providerAccountId && (!row.accountId || row.accountId.length === 0);
  const missingAccessToken = !!row.access_token && !row.accessToken;
  const missingRefreshToken = !!row.refresh_token && !row.refreshToken;
  const missingExpiresAt =
    row.expires_at != null && row.accessTokenExpiresAt == null;

  return (
    missingProviderId ||
    missingAccountId ||
    missingAccessToken ||
    missingRefreshToken ||
    missingExpiresAt
  );
}

async function main() {
  let cursor: string | undefined;
  let scanned = 0;
  let updated = 0;

  while (true) {
    const rows = await prisma.account.findMany({
      where: {
        createdAt: {
          lt: MIGRATION_DATE,
        },
      },
      select: {
        id: true,
        provider: true,
        providerAccountId: true,
        access_token: true,
        refresh_token: true,
        expires_at: true,
        accountId: true,
        providerId: true,
        accessToken: true,
        refreshToken: true,
        accessTokenExpiresAt: true,
      },
      take: BATCH_SIZE,
      orderBy: {
        id: "asc",
      },
      ...(cursor
        ? {
            skip: 1,
            cursor: { id: cursor },
          }
        : {}),
    });

    if (rows.length === 0) {
      break;
    }

    cursor = rows[rows.length - 1].id;
    scanned += rows.length;

    const toUpdate = rows.filter(needsMigration);

    await Promise.all(
      toUpdate.map((row) =>
        prisma.account.update({
          where: { id: row.id },
          data: {
            ...((!row.providerId || row.providerId.length === 0) && row.provider
              ? { providerId: row.provider }
              : {}),
            ...((!row.accountId || row.accountId.length === 0) &&
            row.providerAccountId
              ? { accountId: row.providerAccountId }
              : {}),
            ...(!row.accessToken && row.access_token
              ? { accessToken: row.access_token }
              : {}),
            ...(!row.refreshToken && row.refresh_token
              ? { refreshToken: row.refresh_token }
              : {}),
            ...(row.accessTokenExpiresAt == null && row.expires_at != null
              ? { accessTokenExpiresAt: new Date(row.expires_at * 1000) }
              : {}),
          },
        }),
      ),
    );

    updated += toUpdate.length;

    console.log(
      `Scanned ${scanned} rows created before ${MIGRATION_DATE.toISOString()} (${updated} updated so far)`,
    );

    await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
  }

  console.log(`Done. scanned=${scanned}, updated=${updated}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
