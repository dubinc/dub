import {
  AccountNotFoundError,
  fetchSocialProfile,
} from "@/lib/api/scrape-creators/fetch-social-profile";
import { qstash } from "@/lib/cron";
import { withCron } from "@/lib/cron/with-cron";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { subDays } from "date-fns";
import * as z from "zod/v4";
import { logAndRespond } from "../utils";

export const dynamic = "force-dynamic";

const BATCH_SIZE = 50;

const schema = z.object({
  startingAfter: z.string().optional(),
});

/**
 * This route is used to update stats for verified Instagram, TikTok, and Twitter partners using the ScrapeCreators API
 * Runs once a day at 06:00 AM UTC (cron expression: 0 6 * * *)
 * POST /api/cron/partner-platforms
 */
export const POST = withCron(async ({ rawBody }) => {
  if (!process.env.SCRAPECREATORS_API_KEY) {
    throw new Error("SCRAPECREATORS_API_KEY is not defined");
  }

  let { startingAfter } = schema.parse(
    rawBody ? JSON.parse(rawBody) : { startingAfter: undefined },
  );

  const verifiedProfiles = await prisma.partnerPlatform.findMany({
    where: {
      type: {
        in: ["instagram", "tiktok", "twitter"],
      },
      verifiedAt: {
        not: null,
      },
      // only check platforms that haven't been checked in the last 7 days
      OR: [
        {
          lastCheckedAt: {
            lt: subDays(new Date(), 7),
          },
        },
        {
          lastCheckedAt: null,
        },
      ],
      // only check partners that are discoverable in the partner network
      partner: {
        discoverableAt: {
          not: null,
        },
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

  await Promise.allSettled(
    verifiedProfiles.map(async (verifiedProfile) => {
      if (!verifiedProfile.identifier || !verifiedProfile.type) {
        return;
      }

      try {
        const socialProfile = await fetchSocialProfile({
          platform: verifiedProfile.type,
          handle: verifiedProfile.identifier,
        });

        const newStats = {
          subscribers: socialProfile.subscribers,
          posts: socialProfile.posts,
        };

        await prisma.partnerPlatform.update({
          where: {
            id: verifiedProfile.id,
          },
          data: {
            ...newStats,
            lastCheckedAt: new Date(),
          },
        });

        console.log(
          `Updated ${verifiedProfile.type} stats for @${verifiedProfile.identifier}`,
          newStats,
        );
      } catch (error) {
        // If account doesn't exist, unverify the platform
        if (error instanceof AccountNotFoundError) {
          await prisma.partnerPlatform.update({
            where: {
              id: verifiedProfile.id,
            },
            data: {
              verifiedAt: null,
              lastCheckedAt: new Date(),
            },
          });

          console.log(
            `Account @${verifiedProfile.identifier} on ${verifiedProfile.type} no longer exists. Unverified platform.`,
          );
          return;
        }

        console.error(
          `Error updating ${verifiedProfile.type} stats for @${verifiedProfile.identifier}:`,
          error,
        );
      }
    }),
  );

  if (verifiedProfiles.length === BATCH_SIZE) {
    startingAfter = verifiedProfiles[verifiedProfiles.length - 1].id;

    await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/partner-platforms`,
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
