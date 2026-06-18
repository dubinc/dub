import { withCron } from "@/lib/cron/with-cron";
import { prisma } from "@/lib/prisma";
import { chunk, getDomainWithoutWWW } from "@dub/utils";
import { PlatformType } from "@prisma/client";
import { logAndRespond } from "../../utils";
import { getDomainRating } from "./get-domain-rating";

export const dynamic = "force-dynamic";

const BATCH_SIZE = 60;
const CONCURRENCY = 10;

/**
 * This route is used to update domain rating (DR) for verified website partners using the Ahrefs free API
 * Runs once a minute (cron expression: * * * * *), processing up to 60 platforms per run (Ahrefs rate limit)
 * GET /api/cron/partner-platforms/website
 */
export const GET = withCron(async () => {
  const websites = await prisma.partnerPlatform.findMany({
    where: {
      type: PlatformType.website,
      verifiedAt: {
        not: null,
      },
    },
    take: BATCH_SIZE,
    orderBy: {
      lastCheckedAt: "asc",
    },
  });

  if (websites.length === 0) {
    return logAndRespond("No verified website platforms found.");
  }

  const websiteChunks = chunk(websites, CONCURRENCY);

  for (const websiteChunk of websiteChunks) {
    await Promise.allSettled(
      websiteChunk.map(async (website) => {
        const target =
          getDomainWithoutWWW(website.identifier) ?? website.identifier;

        if (!target) {
          console.error(
            `Invalid website identifier for partner platform ${website.id}: ${website.identifier}`,
          );
          return;
        }

        try {
          const domainRating = await getDomainRating(target);

          await prisma.partnerPlatform.update({
            where: {
              id: website.id,
            },
            data: {
              subscribers: domainRating,
              lastCheckedAt: new Date(),
            },
          });

          console.log(`Updated domain rating for ${target}`, {
            domainRating,
            previousDomainRating: Number(website.subscribers),
            domainRatingChanged: Number(website.subscribers) !== domainRating,
          });
        } catch (error) {
          console.error(`Error updating domain rating for ${target}:`, error);
        }
      }),
    );
  }

  return logAndRespond(
    `Processed domain ratings for ${websites.length} websites.`,
  );
});
