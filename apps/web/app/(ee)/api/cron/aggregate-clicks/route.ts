import { getAnalytics } from "@/lib/analytics/get-analytics";
import { createId } from "@/lib/api/create-id";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { syncTotalCommissions } from "@/lib/api/partners/sync-total-commissions";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { analyticsResponse } from "@/lib/zod/schemas/analytics-response";
import { prisma } from "@dub/prisma";
import { CommissionType } from "@dub/prisma/client";
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

    // getting a list of click reward program enrollments (to update total commissions later)
    const clickEnrollments = clickRewardsWithEnrollments.flatMap(
      ({ clickEnrollments }) => clickEnrollments,
    );

    // creating a map of link id to reward (for easy lookup later)
    const linkRewardMap = new Map(
      clickRewardsWithEnrollments.flatMap(({ clickEnrollments, ...reward }) =>
        clickEnrollments.flatMap(({ links }) =>
          links.map(({ id }) => [id, reward]),
        ),
      ),
    );

    // getting a list of links with clicks
    const linkWithClicks = clickRewardsWithEnrollments.flatMap(
      ({ clickEnrollments }) => clickEnrollments.flatMap(({ links }) => links),
    );

    // getting the actual click count for the links for the previous day
    const linkClickStats: z.infer<(typeof analyticsResponse)["top_links"]>[] =
      await getAnalytics({
        event: "clicks",
        groupBy: "top_links",
        linkIds: linkWithClicks.map(({ id }) => id),
        start,
        end,
      });

    if (linkClickStats.length === 0) {
      return NextResponse.json({
        message: "No clicks found. Skipping...",
      });
    }

    // creating a list of commissions to create
    const commissionsToCreate = linkWithClicks
      .map(({ id, programId, partnerId }) => {
        const linkClicks =
          linkClickStats.find(({ id: linkId }) => linkId === id)?.clicks ?? 0;

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
          amount: reward.amount,
          earnings: reward.amount * linkClicks,
        };
      })
      .filter((c) => c !== null);

    console.table(commissionsToCreate);

    // // Create commissions
    await prisma.commission.createMany({
      data: commissionsToCreate,
    });

    // // Sync total commissions for each partner
    console.time("syncTotalCommissions");
    for (const { partnerId, programId } of clickEnrollments) {
      await syncTotalCommissions({
        partnerId,
        programId,
      });
    }
    console.timeEnd("syncTotalCommissions");
    console.log(
      `Updated total commissions count for ${clickEnrollments.length} partners`,
    );

    return NextResponse.json("OK");
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
