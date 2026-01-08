import { fetchSocialProfile } from "@/lib/api/scrape-creators/fetch-social-profile";
import { withCron } from "@/lib/cron/with-cron";
import { prisma } from "@dub/prisma";
import { PartnerPlatform, SocialPlatform } from "@dub/prisma/client";
import { deepEqual } from "@dub/utils";
import { logAndRespond } from "../utils";

export const dynamic = "force-dynamic";

// This route is used to update social platform stats for verified Instagram, TikTok, and Twitter partners
// Runs once a day at 06:00 AM UTC (cron expression: 0 6 * * *)
// POST /api/cron/online-presence
export const POST = withCron(async () => {
  if (!process.env.SCRAPECREATORS_API_KEY) {
    throw new Error("SCRAPECREATORS_API_KEY is not defined");
  }

  const verifiedProfiles = await prisma.partnerPlatform.findMany({
    where: {
      platform: {
        in: ["instagram", "tiktok", "twitter"],
      },
      verifiedAt: {
        not: null,
      },
    },
  });

  if (verifiedProfiles.length === 0) {
    return logAndRespond(
      "No verified social profiles found. Skipping social platform stats update.",
    );
  }

  for (const verifiedProfile of verifiedProfiles) {
    if (!verifiedProfile.handle) {
      continue;
    }

    try {
      const socialProfile = await fetchSocialProfile({
        platform: verifiedProfile.platform,
        handle: verifiedProfile.handle,
      });

      let currentStats: Pick<PartnerPlatform, "followers" | "posts"> &
        Partial<Pick<PartnerPlatform, "views">>;
      let newStats: Pick<PartnerPlatform, "followers" | "posts"> &
        Partial<Pick<PartnerPlatform, "views">>;

      switch (verifiedProfile.platform) {
        case SocialPlatform.tiktok:
          currentStats = {
            followers: verifiedProfile.followers,
            posts: verifiedProfile.posts,
            views: verifiedProfile.views,
          };

          newStats = {
            followers: socialProfile.followers,
            posts: socialProfile.posts,
            views: socialProfile.views,
          };

          break;

        case SocialPlatform.instagram:
        case SocialPlatform.twitter:
          currentStats = {
            followers: verifiedProfile.followers,
            posts: verifiedProfile.posts,
          };

          newStats = {
            followers: socialProfile.followers,
            posts: socialProfile.posts,
          };

          break;

        default:
          continue;
      }

      if (deepEqual(currentStats, newStats)) {
        continue;
      }

      await prisma.partnerPlatform.update({
        where: {
          id: verifiedProfile.id,
        },
        data: newStats,
      });

      console.log(
        `Updated ${verifiedProfile.platform} stats for @${verifiedProfile.handle}`,
      );
    } catch (error) {
      console.error(
        `Error updating ${verifiedProfile.platform} stats for @${verifiedProfile.handle}:`,
        error,
      );
      continue;
    }
  }

  return logAndRespond(
    `Social platform stats updated for ${verifiedProfiles.length} verified profiles.`,
  );
});
