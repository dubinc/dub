import { getAnalytics } from "@/lib/analytics/get-analytics";
import { createId } from "@/lib/api/create-id";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { syncTotalCommissions } from "@/lib/api/partners/sync-total-commissions";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { prisma } from "@dub/prisma";
import { CommissionType } from "@dub/prisma/client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface ClickStats {
  link_id: string;
  clicks: number;
}

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

    const clickRewards = await prisma.reward.findMany({
      where: {
        event: "click",
      },
      include: {
        clickEnrollments: true,
      },
    });

    if (!clickRewards.length) {
      return NextResponse.json({
        message: "No programs with click rewards found. Skipping...",
      });
    }

    // Process each click reward
    for (const { programId, clickEnrollments, ...reward } of clickRewards) {
      const partnerIds = clickEnrollments.map(({ partnerId }) => partnerId);

      if (!partnerIds || partnerIds.length === 0) {
        console.log("No partnerIds found for program", { programId });
        continue;
      }

      const links = await prisma.link.findMany({
        where: {
          programId,
          partnerId: {
            in: partnerIds,
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
        },
      });

      if (!links.length) {
        console.log(`No links found for program ${programId}`);
        continue;
      }

      const linkIds = links.map(({ id }) => id);

      // TODO:
      // TB pipes need fix
      const clickStats: ClickStats[] = await getAnalytics({
        linkIds,
        start,
        end,
        groupBy: "count",
        event: "clicks",
      });

      if (clickStats.length === 0) {
        console.log(`No click stats found for links ${linkIds}`);
        continue;
      }

      // Preprocess links into a Map for faster lookup
      const linkToPartnerMap = new Map(
        links.map(({ id, partnerId }) => [id, partnerId]),
      );

      const commissions = clickStats.map(
        ({ link_id: linkId, clicks: quantity }) => ({
          id: createId({ prefix: "cm_" }),
          programId,
          partnerId: linkToPartnerMap.get(linkId)!,
          linkId,
          quantity,
          type: CommissionType.click,
          amount: 0,
          earnings: reward.amount * quantity,
        }),
      );

      console.log(commissions);

      // Create commissions
      await prisma.commission.createMany({
        data: commissions,
      });

      // Sync total commissions for each partner
      await Promise.allSettled(
        partnerIds.map((partnerId) =>
          syncTotalCommissions({
            partnerId,
            programId,
          }),
        ),
      );
    }

    return NextResponse.json("OK");
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
