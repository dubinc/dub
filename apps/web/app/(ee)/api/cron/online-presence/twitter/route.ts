import { fetchSocialProfile } from "@/lib/api/scrape-creators/fetch-social-profile";
import { withCron } from "@/lib/cron/with-cron";
import { prisma } from "@dub/prisma";
import { SocialPlatform } from "@dub/prisma/client";
import { deepEqual } from "@dub/utils";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

/*
    This route is used to update Twitter stats for verified Twitter partners
    Runs once a day at 06:00 AM UTC (cron expression: 0 6 * * *)
*/

// POST /api/cron/online-presence/twitter
export const POST = withCron(async () => {
  if (!process.env.SCRAPECREATORS_API_KEY) {
    throw new Error("SCRAPECREATORS_API_KEY is not defined");
  }

  const twitterProfiles = await prisma.partnerPlatform.findMany({
    where: {
      platform: SocialPlatform.twitter,
      verifiedAt: {
        not: null,
      },
    },
  });

  if (twitterProfiles.length === 0) {
    return logAndRespond(
      "No Twitter platforms found. Skipping Twitter stats update.",
    );
  }

  for (const partnerPlatform of twitterProfiles) {
    if (!partnerPlatform.handle) {
      continue;
    }

    try {
      const socialProfile = await fetchSocialProfile({
        platform: SocialPlatform.twitter,
        handle: partnerPlatform.handle,
      });

      const currentStats = {
        followers: partnerPlatform.followers,
        posts: partnerPlatform.posts,
      };

      const newStats = {
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

      console.log(`Updated Twitter stats for @${partnerPlatform.handle}`, {
        followers: Number(newStats.followers),
        posts: Number(newStats.posts),
      });
    } catch (error) {
      console.error(
        `Error updating Twitter stats for @${partnerPlatform.handle}:`,
        error,
      );
      continue;
    }
  }

  return logAndRespond(
    `Twitter stats updated for ${twitterProfiles.length} partners`,
  );
});
