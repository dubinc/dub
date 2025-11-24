import { getAnalytics } from "@/lib/analytics/get-analytics";
import { createId } from "@/lib/api/create-id";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { serializeReward } from "@/lib/api/partners/serialize-reward";
import { syncTotalCommissions } from "@/lib/api/partners/sync-total-commissions";
import { qstash } from "@/lib/cron";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { getRewardAmount } from "@/lib/partners/get-reward-amount";
import { analyticsResponse } from "@/lib/zod/schemas/analytics-response";
import { prisma } from "@dub/prisma";
import { CommissionType, Prisma } from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK, nFormatter } from "@dub/utils";
import { z } from "zod";
import { logAndRespond } from "../utils";

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

    console.time("getAnalytics");
    // getting the actual click count for the links for the previous day
    const linkClickStats: z.infer<(typeof analyticsResponse)["top_links"]>[] =
      await getAnalytics({
        event: "clicks",
        groupBy: "top_links",
        linkIds: linksWithClickRewards.map(({ id }) => id),
        start,
        end,
      });
    console.timeEnd("getAnalytics");

    // This should never happen, but just in case
    if (linkClickStats.length === 0) {
      return logAndRespond(endMessage);
    }

    // creating a map of link id to clicks count (for easy lookup)
    const linkClicksMap = new Map(
      linkClickStats.map(({ id, clicks }) => [id, clicks]),
    );

    // creating a list of commissions to create
    const commissionsToCreate = linksWithClickRewards
      .map(({ id, programId, partnerId, programEnrollment }) => {
        if (!programId || !partnerId || !programEnrollment?.clickReward) {
          return null;
        }

        const linkClicks = linkClicksMap.get(id) ?? 0;
        const earnings =
          getRewardAmount(serializeReward(programEnrollment.clickReward)) *
          linkClicks;

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

    for (const { partnerId, programId } of commissionsToCreate) {
      // Sync total commissions for each partner that we created commissions for
      await syncTotalCommissions({
        partnerId,
        programId,
      });
    }
    console.log(
      `Synced total commissions count for ${commissionsToCreate.length} partners`,
    );

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
