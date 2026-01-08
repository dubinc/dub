import { fetchSocialProfile } from "@/lib/api/scrape-creators/fetch-social-profile";
import { withCron } from "@/lib/cron/with-cron";
import { prisma } from "@dub/prisma";
import { SocialPlatform } from "@dub/prisma/client";
import { deepEqual } from "@dub/utils";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

/*
    This route is used to update TikTok stats for verified TikTok partners
    Runs once a day at 06:00 AM UTC (cron expression: 0 6 * * *)
*/

// POST /api/cron/online-presence/tiktok
export const POST = withCron(async () => {
  if (!process.env.SCRAPECREATORS_API_KEY) {
    throw new Error("SCRAPECREATORS_API_KEY is not defined");
  }

  const tiktokProfiles = await prisma.partnerPlatform.findMany({
    where: {
      platform: SocialPlatform.tiktok,
      verifiedAt: {
        not: null,
      },
    },
  });

  if (tiktokProfiles.length === 0) {
    return logAndRespond(
      "No TikTok platforms found. Skipping TikTok stats update.",
    );
  }

  for (const partnerPlatform of tiktokProfiles) {
    if (!partnerPlatform.handle) {
      continue;
    }

    try {
      const socialProfile = await fetchSocialProfile({
        platform: SocialPlatform.tiktok,
        handle: partnerPlatform.handle,
      });

      const currentStats = {
        followers: partnerPlatform.followers,
        posts: partnerPlatform.posts,
        views: partnerPlatform.views,
      };

      const newStats = {
        followers: socialProfile.followers,
        posts: socialProfile.posts,
        views: socialProfile.views,
      };

      if (deepEqual(currentStats, newStats)) {
        continue;
      }

      await prisma.partnerPlatform.update({
        where: {
          id: partnerPlatform.id,
        },
        data: newStats,
      });

      console.log(`Updated TikTok stats for @${partnerPlatform.handle}`, {
        followers: Number(newStats.followers),
        posts: Number(newStats.posts),
        views: Number(newStats.views),
      });
    } catch (error) {
      console.error(
        `Error updating TikTok stats for @${partnerPlatform.handle}:`,
        error,
      );
      continue;
    }
  }

  return logAndRespond(
    `TikTok stats updated for ${tiktokProfiles.length} partners`,
  );
});
