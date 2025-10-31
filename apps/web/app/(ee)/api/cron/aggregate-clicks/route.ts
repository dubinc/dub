import { getAnalytics } from "@/lib/analytics/get-analytics";
import { createId } from "@/lib/api/create-id";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { serializeReward } from "@/lib/api/partners/serialize-reward";
import { syncTotalCommissions } from "@/lib/api/partners/sync-total-commissions";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { getRewardAmount } from "@/lib/partners/get-reward-amount";
import { analyticsResponse } from "@/lib/zod/schemas/analytics-response";
import { prisma } from "@dub/prisma";
import { CommissionType, Prisma } from "@dub/prisma/client";
import { log } from "@dub/utils";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

// This route is used aggregate clicks events on daily basis for Program links and add to the Commission table
// Runs every day at 00:00 (0 0 * * *)
// GET /api/cron/aggregate-clicks
export async function GET(req: Request) {
  try {
    await verifyVercelSignature(req);

    const now = new Date();

    // set 'start' to the beginning of the previous day (00:00:00)
    const start = new Date(now);
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);

    // set 'end' to the end of the previous day (23:59:59)
    const end = new Date(now);
    end.setDate(end.getDate() - 1);
    end.setHours(23, 59, 59, 999);

    const clickRewardsWithEnrollments = await prisma.reward.findMany({
      where: {
        event: "click",
      },
      include: {
        clickEnrollments: {
          include: {
            links: {
              where: {
                clicks: {
                  gt: 0,
                },
                lastClicked: {
                  gte: start, // links that were clicked on after the start date
                },
              },
            },
          },
        },
      },
    });

    if (!clickRewardsWithEnrollments.length) {
      return NextResponse.json({
        message: "No programs with click rewards found. Skipping...",
      });
    }

    // getting a list of links with clicks
    const linkWithClicks = clickRewardsWithEnrollments.flatMap(
      ({ clickEnrollments }) => clickEnrollments.flatMap(({ links }) => links),
    );

    if (linkWithClicks.length === 0) {
      return NextResponse.json({
        message: "No links with clicks found. Skipping...",
      });
    }

    // getting the actual click count for the links for the previous day
    const linkClickStats: z.infer<(typeof analyticsResponse)["top_links"]>[] =
      await getAnalytics({
        event: "clicks",
        groupBy: "top_links",
        linkIds: linkWithClicks.map(({ id }) => id),
        start,
        end,
      });

    // This should never happen, but just in case
    if (linkClickStats.length === 0) {
      await log({
        message:
          "Failed to get link click stats from Tinybird. Needs investigation.",
        type: "errors",
        mention: true,
      });
      throw new Error("Failed to get link click stats from Tinybird.");
    }

    // creating a map of link id to reward (for easy lookup)
    const linkRewardMap = new Map(
      clickRewardsWithEnrollments.flatMap(({ clickEnrollments, ...reward }) =>
        clickEnrollments.flatMap(({ links }) =>
          links.map(({ id }) => [id, reward]),
        ),
      ),
    );
    const linkClicksMap = new Map(
      linkClickStats.map(({ id, clicks }) => [id, clicks]),
    );

    // creating a list of commissions to create
    const commissionsToCreate = linkWithClicks
      .map(({ id, programId, partnerId }) => {
        const linkClicks = linkClicksMap.get(id) ?? 0;
        const reward = linkRewardMap.get(id);
        if (!programId || !partnerId || linkClicks === 0 || !reward) {
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
          earnings: getRewardAmount(serializeReward(reward)) * linkClicks,
        };
      })
      .filter((c) => c !== null) as Prisma.CommissionCreateManyInput[];

    console.table(commissionsToCreate);

    // // Create commissions
    await prisma.commission.createMany({
      data: commissionsToCreate,
    });

    // getting a list of click reward program enrollments
    const clickEnrollments = clickRewardsWithEnrollments.flatMap(
      ({ clickEnrollments }) => clickEnrollments,
    );

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

    return NextResponse.json("OK");
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
