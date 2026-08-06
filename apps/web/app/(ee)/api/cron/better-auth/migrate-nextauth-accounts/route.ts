import { qstash } from "@/lib/cron";
import { withCron } from "@/lib/cron/with-cron";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/upstash/redis";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { Account } from "@prisma/client";
import { logAndRespond } from "app/(ee)/api/cron/utils";
import * as z from "zod/v4";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;
const MAX_BATCH = 5;

const LOCK_KEY = "lock:better-auth:migrate-nextauth-accounts";
const LOCK_TTL_SECONDS = 600; // ≥ cron maxDuration

// Accounts created before this date are treated as NextAuth-era rows.
const MIGRATION_DATE = new Date("2026-08-06T00:00:00.000Z");

const CRON_URL = `${APP_DOMAIN_WITH_NGROK}/api/cron/better-auth/migrate-nextauth-accounts`;

const schema = z.object({
  cursor: z.string().optional(),
});

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

async function migrateAccount(row: AccountRow) {
  await prisma.account.update({
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
  });
}

// POST /api/cron/better-auth/migrate-nextauth-accounts
export const POST = withCron(async ({ rawBody }) => {
  const acquired = await redis.set(LOCK_KEY, "1", {
    nx: true,
    ex: LOCK_TTL_SECONDS,
  });

  if (!acquired) {
    return logAndRespond(
      "[migrate-nextauth-accounts] Another run is in progress. Skipping...",
    );
  }

  try {
    const { cursor } = rawBody
      ? schema.parse(JSON.parse(rawBody))
      : schema.parse({});

    let hasMore = true;
    let currentCursor = cursor;
    let processedBatches = 0;
    let migratedCount = 0;
    let scannedCount = 0;

    while (processedBatches < MAX_BATCH) {
      const rows = await prisma.account.findMany({
        where: {
          createdAt: {
            lt: MIGRATION_DATE,
          },
          ...(currentCursor && {
            id: {
              gt: currentCursor,
            },
          }),
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
        take: PAGE_SIZE,
        orderBy: {
          id: "asc",
        },
      });

      if (rows.length === 0) {
        hasMore = false;
        break;
      }

      const toUpdate = rows.filter(needsMigration);

      if (toUpdate.length > 0) {
        await Promise.allSettled(toUpdate.map((row) => migrateAccount(row)));
      }

      scannedCount += rows.length;
      migratedCount += toUpdate.length;
      currentCursor = rows[rows.length - 1].id;
      hasMore = rows.length === PAGE_SIZE;
      processedBatches++;
    }

    if (hasMore) {
      await qstash.publishJSON({
        url: CRON_URL,
        method: "POST",
        // Small delay so this invocation releases the lock before the next run
        delay: 2,
        body: {
          cursor: currentCursor,
        },
      });

      return logAndRespond(
        `[migrate-nextauth-accounts] Migrated ${migratedCount}/${scannedCount} accounts across ${processedBatches} batches. Requeued from cursor ${currentCursor}.`,
      );
    }

    return logAndRespond(
      `[migrate-nextauth-accounts] Migrated ${migratedCount}/${scannedCount} accounts across ${processedBatches} batches. Done.`,
    );
  } finally {
    await redis.del(LOCK_KEY);
  }
});
