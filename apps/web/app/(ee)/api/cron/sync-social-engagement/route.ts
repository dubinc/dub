import { withCron } from "@/lib/cron/with-cron";
import { getPlatformAdapter } from "@/lib/social-platforms";
import type { DailyEngagement } from "@/lib/social-platforms/base-adapter";
import { XApiError, XApiRateLimitError } from "@/lib/social-platforms/x/client";
import { prisma } from "@dub/prisma";
import { startOfDay, subDays } from "date-fns";
import * as z from "zod/v4";
import { logAndRespond } from "../utils";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  partnerPlatformId: z.string(),
});

// POST /api/cron/sync-social-engagement
// Processes a single partner platform: fetches engagement data, upserts snapshots,
// prunes old data, and recomputes the rolling average.
export const POST = withCron(async ({ rawBody }) => {
  const { partnerPlatformId } = bodySchema.parse(JSON.parse(rawBody));

  const partnerPlatform = await prisma.partnerPlatform.findUnique({
    where: {
      id: partnerPlatformId,
    },
    select: {
      id: true,
      platformId: true,
      identifier: true,
      type: true,
    },
  });

  if (!partnerPlatform) {
    return logAndRespond(
      `Partner platform ${partnerPlatformId} not found. Skipping.`,
      { logLevel: "warn" },
    );
  }

  if (!partnerPlatform.platformId) {
    return logAndRespond(
      `Partner platform ${partnerPlatformId} (@${partnerPlatform.identifier}) has no platformId. Skipping.`,
      { logLevel: "warn" },
    );
  }

  const adapter = getPlatformAdapter(partnerPlatform.type);

  if (!adapter) {
    return logAndRespond(
      `No engagement adapter for platform type "${partnerPlatform.type}". Skipping.`,
      { logLevel: "warn" },
    );
  }

  // Determine date range: first run = 30 days, subsequent = yesterday only
  const now = new Date();
  const todayStart = startOfDay(now);

  const existingCount = await prisma.partnerEngagement.count({
    where: {
      partnerPlatformId,
    },
  });

  const startTime =
    existingCount === 0
      ? startOfDay(subDays(now, 30))
      : startOfDay(subDays(now, 1));
  const endTime = todayStart;

  let dailyEngagements: DailyEngagement[];

  try {
    dailyEngagements = await adapter.fetchEngagement({
      platformId: partnerPlatform.platformId,
      identifier: partnerPlatform.identifier,
      startTime,
      endTime,
    });
  } catch (error) {
    // Rate limit — throw so QStash retries with backoff
    if (error instanceof XApiRateLimitError) {
      throw error;
    }

    // Client errors — don't retry
    if (error instanceof XApiError) {
      console.error(
        `[sync-social-engagement] X API error for @${partnerPlatform.identifier}:`,
        error.message,
      );

      return logAndRespond(
        `X API error for @${partnerPlatform.identifier}: ${error.message}`,
        { logLevel: "error" },
      );
    }

    throw error;
  }

  // Upsert engagement snapshots
  for (const day of dailyEngagements) {
    await prisma.partnerEngagement.upsert({
      where: {
        partnerPlatformId_date: {
          partnerPlatformId,
          date: day.date,
        },
      },
      create: {
        partnerPlatformId,
        date: day.date,
        platform: partnerPlatform.type,
        totalPosts: day.totalPosts,
        totalImpressions: BigInt(day.totalImpressions),
        totalLikes: BigInt(day.totalLikes),
        totalComments: BigInt(day.totalComments),
        engagementRate: day.engagementRate,
      },
      update: {
        totalPosts: day.totalPosts,
        totalImpressions: BigInt(day.totalImpressions),
        totalLikes: BigInt(day.totalLikes),
        totalComments: BigInt(day.totalComments),
        engagementRate: day.engagementRate,
      },
    });
  }

  // Prune old engagements (keep 31 days for timezone safety)
  await prisma.partnerEngagement.deleteMany({
    where: {
      partnerPlatformId,
      date: {
        lt: startOfDay(subDays(now, 31)),
      },
    },
  });

  // Recompute avgEngagementRate
  const thirtyDaysAgo = startOfDay(subDays(now, 30));

  const result = await prisma.partnerEngagement.aggregate({
    where: {
      partnerPlatformId,
      date: {
        gte: thirtyDaysAgo,
      },
    },
    _avg: {
      engagementRate: true,
    },
  });

  const avgEngagementRate = result._avg.engagementRate ?? 0;

  await prisma.partnerPlatform.update({
    where: {
      id: partnerPlatformId,
    },
    data: {
      avgEngagementRate,
    },
  });

  return logAndRespond(
    `Synced engagement for @${partnerPlatform.identifier}: ${dailyEngagements.length} days, avgRate=${avgEngagementRate.toFixed(6)}`,
  );
});
