import { qstash } from "@/lib/cron";
import { withCron } from "@/lib/cron/with-cron";
import { prisma } from "@dub/prisma";
import { PlatformType } from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK, chunk, getDomainWithoutWWW } from "@dub/utils";
import * as z from "zod/v4";
import { logAndRespond } from "../../utils";
import { getDomainRating } from "./get-domain-rating";

export const dynamic = "force-dynamic";

const BATCH_SIZE = 500;
const CONCURRENCY = 10;

const schema = z.object({
  startingAfter: z.string().optional(),
});

/**
 * This route is used to update domain rating (DR) for verified website partners using the Ahrefs free API
 * Runs once a day at 05:00 AM UTC (cron expression: 0 5 * * *)
 * POST /api/cron/partner-platforms/website
 */
export const POST = withCron(async ({ rawBody }) => {
  let { startingAfter } = schema.parse(
    rawBody ? JSON.parse(rawBody) : { startingAfter: undefined },
  );

  const websites = await prisma.partnerPlatform.findMany({
    where: {
      type: PlatformType.website,
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

  if (websites.length === 0) {
    return logAndRespond(
      "No more website platforms found. Finished updating website domain ratings.",
    );
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

          if (website.subscribers === BigInt(domainRating)) {
            console.log(
              `No changes to update for ${target} (DR: ${domainRating}), skipping...`,
            );
            return;
          }

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
          });
        } catch (error) {
          console.error(`Error updating domain rating for ${target}:`, error);
        }
      }),
    );
  }

  if (websites.length === BATCH_SIZE) {
    startingAfter = websites[websites.length - 1].id;

    await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/partner-platforms/website`,
      method: "POST",
      body: {
        startingAfter,
      },
    });

    return logAndRespond(
      `Processed ${BATCH_SIZE} websites. Scheduled next batch (startingAfter: ${startingAfter}).`,
    );
  }

  return logAndRespond(
    `Finished updating domain ratings for ${websites.length} websites.`,
  );
});
