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
    );
  }

  if (!partnerPlatform.platformId) {
    return logAndRespond(
      `Partner platform ${partnerPlatformId} (@${partnerPlatform.identifier}) has no platformId. Skipping.`,
    );
  }

  const platform = getPlatformAdapter(partnerPlatform.type);

  if (!platform) {
    return logAndRespond(
      `No engagement adapter for platform type "${partnerPlatform.type}". Skipping.`,
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

  const posts = await platform.fetchPosts({
    platformId: partnerPlatform.platformId,
    identifier: partnerPlatform.identifier,
    startTime,
    endTime,
  });

  const dailyEngagements = platform.calculateDailyEngagement(posts);

  // Daily aggregate upserts
  await prisma.$transaction(
    dailyEngagements.map((day) =>
      prisma.partnerPlatformEngagement.upsert({
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
      }),
    ),
  );

  // Prune old daily engagements (keep 31 days for timezone safety)
  await prisma.partnerPlatformEngagement.deleteMany({
    where: {
      partnerPlatformId,
      date: {
        lt: startOfDay(subDays(now, 31)),
      },
    },
  });

  // Per-post upserts
  await prisma.$transaction(
    posts.map((post) =>
      prisma.partnerPlatformPost.upsert({
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
      }),
    ),
  );

  // Prune to last N posts per partner
  await prisma.$transaction(async (tx) => {
    const postCount = await tx.partnerPlatformPost.count({
      where: {
        partnerPlatformId,
      },
    });

    if (postCount <= MAX_POSTS_PER_PARTNER) {
      return;
    }

    const postsToKeep = await tx.partnerPlatformPost.findMany({
      where: {
        partnerPlatformId,
      },
      orderBy: {
        publishedAt: "desc",
      },
      take: MAX_POSTS_PER_PARTNER,
      select: {
        id: true,
      },
    });

    const keepIds = postsToKeep.map((p) => p.id);

    await tx.partnerPlatformPost.deleteMany({
      where: {
        partnerPlatformId,
        id: {
          notIn: keepIds,
        },
      },
    });
  });

  // Recompute avgEngagementRate
  const avgResult = await prisma.partnerPlatformEngagement.aggregate({
    where: {
      partnerPlatformId,
      date: {
        gte: startOfDay(subDays(now, 30)),
      },
    },
    _avg: {
      engagementRate: true,
    },
  });

  const avgEngagementRate = avgResult._avg.engagementRate ?? 0;

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
    `[sync-social-engagement] Synced @${partnerPlatform.identifier}: ${dailyEngagements.length} days, ${posts.length} posts, avgRate=${avgEngagementRate.toFixed(6)}, medianViews=${medianViews}`,
  );

  return logAndRespond(
    `Synced engagement for @${partnerPlatform.identifier}: ${dailyEngagements.length} days, ${posts.length} posts`,
  );
});

function computeMedian(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  // For odd-length arrays, return the middle element;
  // for even-length, average the two middle elements
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
