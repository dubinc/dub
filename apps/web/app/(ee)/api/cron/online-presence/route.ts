import { fetchSocialProfile } from "@/lib/api/scrape-creators/fetch-social-profile";
import { qstash } from "@/lib/cron";
import { withCron } from "@/lib/cron/with-cron";
import { prisma } from "@dub/prisma";
import { PartnerPlatform, SocialPlatform } from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK, deepEqual } from "@dub/utils";
import * as z from "zod/v4";
import { logAndRespond } from "../utils";

export const dynamic = "force-dynamic";

const BATCH_SIZE = 50;

const schema = z.object({
  startingAfter: z.string().optional(),
});

// This route is used to update social platform stats for verified Instagram, TikTok, and Twitter partners
// Runs once a day at 06:00 AM UTC (cron expression: 0 6 * * *)
// POST /api/cron/online-presence
export const POST = withCron(async ({ rawBody, searchParams }) => {
  if (!process.env.SCRAPECREATORS_API_KEY) {
    throw new Error("SCRAPECREATORS_API_KEY is not defined");
  }

  let { startingAfter } = schema.parse(
    rawBody ? JSON.parse(rawBody) : { startingAfter: undefined },
  );

  const verifiedProfiles = await prisma.partnerPlatform.findMany({
    where: {
      platform: {
        in: ["instagram", "tiktok", "twitter"],
      },
      verifiedAt: {
        not: null,
      },
    },
    take: BATCH_SIZE,
    ...(startingAfter && {
      cursor: {
        id: startingAfter,
      },
      skip: 1,
    }),
    orderBy: {
      id: "asc",
    },
  });

  if (verifiedProfiles.length === 0) {
    return logAndRespond(
      "No more verified social profiles found. Finished updating social platform stats.",
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
        // TikTok
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

        // Instagram, Twitter
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

  if (verifiedProfiles.length === BATCH_SIZE) {
    startingAfter = verifiedProfiles[verifiedProfiles.length - 1].id;

    await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/online-presence`,
      method: "POST",
      body: {
        startingAfter,
      },
    });

    return logAndRespond(
      `Processed ${BATCH_SIZE} profiles. Scheduled next batch (startingAfter: ${startingAfter}).`,
    );
  }

  return logAndRespond(
    "Finished updating social platform stats for all verified profiles.",
  );
});
