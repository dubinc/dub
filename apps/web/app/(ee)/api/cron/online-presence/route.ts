import { fetchSocialProfile } from "@/lib/api/scrape-creators/fetch-social-profile";
import { withCron } from "@/lib/cron/with-cron";
import { prisma } from "@dub/prisma";
import { SocialPlatform } from "@dub/prisma/client";
import { deepEqual } from "@dub/utils";
import { logAndRespond } from "../utils";

export const dynamic = "force-dynamic";

/*
    This route is used to update social platform stats for verified Instagram, TikTok, and Twitter partners
    Runs once a day at 06:00 AM UTC (cron expression: 0 6 * * *)
*/

// POST /api/cron/online-presence
export const POST = withCron(async () => {
  if (!process.env.SCRAPECREATORS_API_KEY) {
    throw new Error("SCRAPECREATORS_API_KEY is not defined");
  }

  const platforms: SocialPlatform[] = [
    SocialPlatform.instagram,
    SocialPlatform.tiktok,
    SocialPlatform.twitter,
  ];

  const allProfiles = await prisma.partnerPlatform.findMany({
    where: {
      platform: {
        in: platforms,
      },
      verifiedAt: {
        not: null,
      },
    },
  });

  if (allProfiles.length === 0) {
    return logAndRespond(
      "No social platforms found. Skipping social platform stats update.",
    );
  }

  const results = {
    instagram: { updated: 0, errors: 0 },
    tiktok: { updated: 0, errors: 0 },
    twitter: { updated: 0, errors: 0 },
  };

  for (const partnerPlatform of allProfiles) {
    if (!partnerPlatform.handle) {
      continue;
    }

    try {
      const socialProfile = await fetchSocialProfile({
        platform: partnerPlatform.platform,
        handle: partnerPlatform.handle,
      });

      // TikTok includes views, others don't
      const currentStats =
        partnerPlatform.platform === SocialPlatform.tiktok
          ? {
              followers: partnerPlatform.followers,
              posts: partnerPlatform.posts,
              views: partnerPlatform.views,
            }
          : {
              followers: partnerPlatform.followers,
              posts: partnerPlatform.posts,
            };

      const newStats =
        partnerPlatform.platform === SocialPlatform.tiktok
          ? {
              followers: socialProfile.followers,
              posts: socialProfile.posts,
              views: socialProfile.views,
            }
          : {
              followers: socialProfile.followers,
              posts: socialProfile.posts,
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

      const platformKey = partnerPlatform.platform as keyof typeof results;
      results[platformKey].updated++;

      const logData =
        partnerPlatform.platform === SocialPlatform.tiktok
          ? {
              followers: Number(newStats.followers),
              posts: Number(newStats.posts),
              views: Number(newStats.views),
            }
          : {
              followers: Number(newStats.followers),
              posts: Number(newStats.posts),
            };

      console.log(
        `Updated ${partnerPlatform.platform} stats for @${partnerPlatform.handle}`,
        logData,
      );
    } catch (error) {
      const platformKey = partnerPlatform.platform as keyof typeof results;
      results[platformKey].errors++;

      console.error(
        `Error updating ${partnerPlatform.platform} stats for @${partnerPlatform.handle}:`,
        error,
      );
      continue;
    }
  }

  const totalUpdated =
    results.instagram.updated +
    results.tiktok.updated +
    results.twitter.updated;
  const totalErrors =
    results.instagram.errors + results.tiktok.errors + results.twitter.errors;

  return logAndRespond(
    `Social platform stats updated: ${totalUpdated} updated, ${totalErrors} errors (Instagram: ${results.instagram.updated}, TikTok: ${results.tiktok.updated}, Twitter: ${results.twitter.updated})`,
  );
});
