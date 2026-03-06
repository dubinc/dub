import {
  AccountNotFoundError,
  getSocialProfile,
} from "@/lib/api/scrape-creators/get-social-profile";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

const BATCH_SIZE = 10;

async function main() {
  let startingAfter: string | undefined = undefined;
  let totalUpdated = 0;
  let totalSkipped = 0;

  while (true) {
    const partnerPlatforms = await prisma.partnerPlatform.findMany({
      where: {
        type: "twitter",
        verifiedAt: { not: null },
        platformId: null,
      },
      take: BATCH_SIZE,
      orderBy: {
        id: "asc",
      },
      ...(startingAfter
        ? {
            skip: 1,
            cursor: {
              id: startingAfter,
            },
          }
        : {}),
    });

    if (partnerPlatforms.length === 0) {
      break;
    }

    const promises = partnerPlatforms.map(async (pp) => {
      const socialProfile = await getSocialProfile({
        platform: "twitter",
        handle: pp.identifier,
      });

      if (!socialProfile.platformId) {
        console.warn(`No platformId returned for @${pp.identifier}, skipping`);
        return null;
      }

      // I prefer this
      await prisma.partnerPlatform.update({
        where: {
          id: pp.id,
        },
        data: {
          platformId: socialProfile.platformId,
        },
      });

      console.log(
        `Updated platformId for @${pp.identifier} (${socialProfile.platformId})`,
      );
      return pp.identifier;
    });

    const results = await Promise.allSettled(promises);

    for (const result of results) {
      if (result.status === "fulfilled" && result.value !== null) {
        totalUpdated++;
      } else if (result.status === "rejected") {
        totalSkipped++;
        const error = result.reason;
        if (error instanceof AccountNotFoundError) {
          console.warn(`Account not found, skipping`);
        } else {
          console.error(`Failed to backfill:`, error);
        }
      } else {
        totalSkipped++;
      }
    }

    startingAfter = partnerPlatforms[partnerPlatforms.length - 1].id;

    // Respect ScrapeCreators rate limits
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log(
    `Backfill complete. Updated: ${totalUpdated}, Skipped: ${totalSkipped}`,
  );
}

main();
