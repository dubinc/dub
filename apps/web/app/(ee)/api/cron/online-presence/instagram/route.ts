import { fetchSocialProfile } from "@/lib/api/scrape-creators/fetch-social-profile";
import { withCron } from "@/lib/cron/with-cron";
import { prisma } from "@dub/prisma";
import { SocialPlatform } from "@dub/prisma/client";
import { deepEqual } from "@dub/utils";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

/*
    This route is used to update Instagram stats for verified Instagram partners
    Runs once a day at 06:00 AM UTC (cron expression: 0 6 * * *)
*/

// POST /api/cron/online-presence/instagram
export const POST = withCron(async () => {
  if (!process.env.SCRAPECREATORS_API_KEY) {
    throw new Error("SCRAPECREATORS_API_KEY is not defined");
  }

  const instagramProfiles = await prisma.partnerPlatform.findMany({
    where: {
      platform: SocialPlatform.instagram,
      verifiedAt: {
        not: null,
      },
    },
  });

  if (instagramProfiles.length === 0) {
    return logAndRespond(
      "No Instagram platforms found. Skipping Instagram stats update.",
    );
  }

  for (const partnerPlatform of instagramProfiles) {
    if (!partnerPlatform.handle) {
      continue;
    }

    try {
      const socialProfile = await fetchSocialProfile({
        platform: SocialPlatform.instagram,
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

      console.log(`Updated Instagram stats for @${partnerPlatform.handle}`, {
        followers: Number(newStats.followers),
        posts: Number(newStats.posts),
      });
    } catch (error) {
      console.error(
        `Error updating Instagram stats for @${partnerPlatform.handle}:`,
        error,
      );
      continue;
    }
  }

  return logAndRespond(
    `Instagram stats updated for ${instagramProfiles.length} partners`,
  );
});
