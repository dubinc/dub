import { withCron } from "@/lib/cron/with-cron";
import { getPlatformAdapter } from "@/lib/social-platforms";
import { prisma } from "@dub/prisma";
import { startOfDay, subDays } from "date-fns";
import * as z from "zod/v4";
import { logAndRespond } from "../utils";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  partnerPlatformId: z.string(),
});

const MAX_POSTS_PER_PARTNER = 50;

function computeMedian(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }

  return sorted[mid];
}

// POST /api/cron/sync-social-engagement
// Processes a single partner platform: fetches engagement data, upserts daily
// snapshots + individual posts, prunes old data, and recomputes baselines.
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

  const platformAdapter = getPlatformAdapter(partnerPlatform.type);

  if (!platformAdapter) {
    return logAndRespond(
      `No engagement adapter for platform type "${partnerPlatform.type}". Skipping.`,
      { logLevel: "warn" },
    );
  }

  // Determine date range: first run = 30 days, subsequent = yesterday only
  const now = new Date();
  const todayStart = startOfDay(now);

  const existingCount = await prisma.partnerPlatformEngagement.count({
    where: {
      partnerPlatformId,
    },
  });

  const startTime =
    existingCount === 0
      ? startOfDay(subDays(now, 30))
      : startOfDay(subDays(now, 1));
  const endTime = todayStart;

  const postEngagements = await platformAdapter.fetchPosts({
    platformId: partnerPlatform.platformId,
    identifier: partnerPlatform.identifier,
    startTime,
    endTime,
  });

  const dailyEngagements =
    platformAdapter.calculateDailyEngagement(postEngagements);

  // Daily aggregate upserts
  for (const day of dailyEngagements) {
    await prisma.partnerPlatformEngagement.upsert({
      where: {
        partnerPlatformId_date: {
          partnerPlatformId,
          date: day.date,
        },
      },
      create: {
        partnerPlatformId,
        date: day.date,
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

  // Prune old daily engagements (keep 31 days for timezone safety)
  await prisma.partnerPlatformEngagement.deleteMany({
    where: {
      partnerPlatformId,
      date: {
        lt: startOfDay(subDays(now, 31)),
      },
    },
  });

  // Recompute avgEngagementRate
  const thirtyDaysAgo = startOfDay(subDays(now, 30));

  const avgResult = await prisma.partnerPlatformEngagement.aggregate({
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

  const avgEngagementRate = avgResult._avg.engagementRate ?? 0;

  // Per-post upserts
  for (const post of postEngagements) {
    await prisma.partnerPlatformPost.upsert({
      where: {
        partnerPlatformId_postId: {
          partnerPlatformId,
          postId: post.postId,
        },
      },
      create: {
        partnerPlatformId,
        postId: post.postId,
        publishedAt: post.publishedAt,
        title: post.title,
        views: BigInt(post.views),
        likes: BigInt(post.likes),
        comments: BigInt(post.comments),
        engagementRate: post.engagementRate,
      },
      update: {
        views: BigInt(post.views),
        likes: BigInt(post.likes),
        comments: BigInt(post.comments),
        engagementRate: post.engagementRate,
      },
    });
  }

  // Prune to last N posts per partner
  const postCount = await prisma.partnerPlatformPost.count({
    where: {
      partnerPlatformId,
    },
  });

  if (postCount > MAX_POSTS_PER_PARTNER) {
    const oldestToKeep = await prisma.partnerPlatformPost.findMany({
      where: {
        partnerPlatformId,
      },
      orderBy: {
        publishedAt: "desc",
      },
      take: MAX_POSTS_PER_PARTNER,
      select: {
        publishedAt: true,
      },
    });

    const cutoff = oldestToKeep[oldestToKeep.length - 1].publishedAt;

    await prisma.partnerPlatformPost.deleteMany({
      where: {
        partnerPlatformId,
        publishedAt: {
          lt: cutoff,
        },
      },
    });
  }

  // Compute median baselines from stored posts
  const allPosts = await prisma.partnerPlatformPost.findMany({
    where: {
      partnerPlatformId,
    },
    select: {
      views: true,
      likes: true,
      comments: true,
      engagementRate: true,
    },
  });

  const medianViews = computeMedian(allPosts.map((p) => Number(p.views)));
  const medianLikes = computeMedian(allPosts.map((p) => Number(p.likes)));
  const medianComments = computeMedian(allPosts.map((p) => Number(p.comments)));
  const medianEngagementRate = computeMedian(
    allPosts.map((p) => p.engagementRate),
  );

  // Update PartnerPlatform with baselines
  await prisma.partnerPlatform.update({
    where: {
      id: partnerPlatformId,
    },
    data: {
      avgEngagementRate,
      medianViews: BigInt(Math.round(medianViews)),
      medianLikes: BigInt(Math.round(medianLikes)),
      medianComments: BigInt(Math.round(medianComments)),
      medianEngagementRate,
    },
  });

  console.log(
    `[sync-social-engagement] Synced @${partnerPlatform.identifier}: ${dailyEngagements.length} days, ${postEngagements.length} posts, avgRate=${avgEngagementRate.toFixed(6)}, medianViews=${medianViews}`,
  );

  return logAndRespond(
    `Synced engagement for @${partnerPlatform.identifier}: ${dailyEngagements.length} days, ${postEngagements.length} posts`,
  );
});
