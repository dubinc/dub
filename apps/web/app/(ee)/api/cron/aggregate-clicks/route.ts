import { createId } from "@/lib/api/create-id";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { syncTotalCommissions } from "@/lib/api/partners/sync-total-commissions";
import { qstash } from "@/lib/cron";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { getTopLinksByCountries } from "@/lib/tinybird/get-top-links-by-countries";
import { prisma } from "@dub/prisma";
import { CommissionType, Prisma } from "@dub/prisma/client";
import {
  APP_DOMAIN_WITH_NGROK,
  currencyFormatter,
  getPrettyUrl,
  nFormatter,
} from "@dub/utils";
import { z } from "zod";
import { logAndRespond } from "../utils";
import { resolveClickRewardAmount } from "./resolve-click-reward-amount";

export const dynamic = "force-dynamic";

const BATCH_SIZE = 200;

const schema = z.object({
  startingAfter: z.string().optional(),
  batchNumber: z.number().optional().default(1),
});

// This route is used aggregate clicks events on daily basis for Program links and add to the Commission table
// Runs every day at 00:00 (0 0 * * *)
// GET /api/cron/aggregate-clicks
async function handler(req: Request) {
  try {
    let { startingAfter, batchNumber } = schema.parse({
      startingAfter: undefined,
      batchNumber: 1,
    });

    if (req.method === "GET") {
      await verifyVercelSignature(req);
    } else if (req.method === "POST") {
      const rawBody = await req.text();
      await verifyQstashSignature({
        req,
        rawBody,
      });

      ({ startingAfter, batchNumber } = schema.parse(JSON.parse(rawBody)));
    }

    const now = new Date();

    // set 'start' to the beginning of the previous day (00:00:00)
    const start = new Date(now);
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);

    // set 'end' to the end of the previous day (23:59:59)
    const end = new Date(now);
    end.setDate(end.getDate() - 1);
    end.setHours(23, 59, 59, 999);

    const linksWithClickRewards = await prisma.link.findMany({
      where: {
        programEnrollment: {
          clickRewardId: {
            not: null,
          },
        },
        clicks: {
          gt: 0,
        },
        lastClicked: {
          gte: start, // links that were clicked on after the start date
        },
      },
      select: {
        id: true,
        shortLink: true,
        programId: true,
        partnerId: true,
        programEnrollment: {
          select: {
            clickReward: true,
          },
        },
      },
      take: BATCH_SIZE,
      skip: startingAfter ? 1 : 0,
      ...(startingAfter && {
        cursor: {
          id: startingAfter,
        },
      }),
      orderBy: {
        id: "asc",
      },
    });

    const endMessage = `Finished aggregating clicks for ${batchNumber} batches (total ${nFormatter(batchNumber * (BATCH_SIZE - 1) + linksWithClickRewards.length, { full: true })} links)`;

    if (linksWithClickRewards.length === 0) {
      return logAndRespond(endMessage);
    }

    const clicksByCountries = await getTopLinksByCountries({
      linkIds: linksWithClickRewards.map(({ id }) => id),
      start,
      end,
    });

    // This should never happen, but just in case
    if (clicksByCountries.length === 0) {
      return logAndRespond(endMessage);
    }

    // Group clicks by link_id for easier iteration
    const clicksByLinkId = new Map<string, typeof clicksByCountries>();
    for (const click of clicksByCountries) {
      const existing = clicksByLinkId.get(click.link_id) || [];
      existing.push(click);
      clicksByLinkId.set(click.link_id, existing);
    }

    const linkEarningsMap = new Map<
      string,
      { linkClicks: number; earnings: number }
    >();

    // Calculate earnings per link considering geo CPC
    for (const {
      id: linkId,
      shortLink,
      programEnrollment,
    } of linksWithClickRewards) {
      if (!programEnrollment?.clickReward) {
        console.log(`No click reward for link ${linkId}.`);
        continue;
      }

      const linkClicksByCountry = clicksByLinkId.get(linkId) || [];

      // Calculate earnings per country for each link
      for (const { country, clicks } of linkClicksByCountry) {
        const rewardAmount = resolveClickRewardAmount({
          reward: programEnrollment.clickReward,
          country,
        });

        const existing = linkEarningsMap.get(linkId) || {
          linkClicks: 0,
          earnings: 0,
        };

        linkEarningsMap.set(linkId, {
          linkClicks: existing.linkClicks + clicks,
          earnings: existing.earnings + rewardAmount * clicks,
        });

        // only console.log if there are modifiers
        if (programEnrollment.clickReward.modifiers) {
          console.log(
            `Earnings for link ${getPrettyUrl(shortLink)} for ${country}: ${currencyFormatter(rewardAmount)} * ${clicks} = ${currencyFormatter(
              rewardAmount * clicks,
            )}`,
          );
        }
      }
    }

    // Create commissions for each link
    const commissionsToCreate = linksWithClickRewards
      .map(({ id, programId, partnerId, programEnrollment }) => {
        if (!programId || !partnerId || !programEnrollment?.clickReward) {
          return null;
        }

        const { linkClicks, earnings } = linkEarningsMap.get(id) || {
          linkClicks: 0,
          earnings: 0,
        };

        if (linkClicks === 0 || earnings === 0) {
          return null;
        }

        return {
          id: createId({ prefix: "cm_" }),
          programId,
          partnerId,
          linkId: id,
          quantity: linkClicks,
          type: CommissionType.click,
          amount: 0,
          earnings,
        };
      })
      .filter(
        (c): c is NonNullable<typeof c> => c !== null,
      ) satisfies Prisma.CommissionCreateManyInput[];

    console.table(commissionsToCreate);

    // Create commissions
    await prisma.commission.createMany({
      data: commissionsToCreate,
    });

    // Sync total commissions for each partner that we created commissions for
    for (const { partnerId, programId } of commissionsToCreate) {
      await syncTotalCommissions({
        partnerId,
        programId,
      });
    }

    console.log(
      `Synced total commissions count for ${commissionsToCreate.length} partners`,
    );

    // Schedule next batch if we have more links to process
    if (linksWithClickRewards.length === BATCH_SIZE) {
      const nextStartingAfter =
        linksWithClickRewards[linksWithClickRewards.length - 1].id;

      await qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/aggregate-clicks`,
        method: "POST",
        body: {
          startingAfter: nextStartingAfter,
          batchNumber: batchNumber + 1,
        },
      });

      return logAndRespond(
        `Enqueued next batch (batch #${batchNumber + 1} for aggregate clicks cron (startingAfter: ${nextStartingAfter}).`,
      );
    }

    return logAndRespond(endMessage);
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}

export { handler as GET, handler as POST };
