import { getAnalytics } from "@/lib/analytics/get-analytics";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { prisma } from "@dub/prisma";
import { EventType, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * TODO:
 * - Use a cron job (similar to how we do it for usage cron) to account for the future where we have a lot of links to process
 * - Might be better to read directly from the Reward table and fetch relevant links from there
 * - Once these are ready, we'll add back the cron job in vercel.json
    {
      "path": "/api/cron/aggregate-clicks",
      "schedule": "0 0 * * *"
    },
 */

// This route is used aggregate clicks events on daily basis for Program links and add to the Commission table
// Runs every day at 00:00 (0 0 * * *)
// GET /api/cron/aggregate-clicks
export async function GET(req: Request) {
  try {
    await verifyVercelSignature(req);

    const links = await prisma.link.findMany({
      where: {
        programId: {
          not: null,
        },
        partnerId: {
          not: null,
        },
        clicks: {
          gt: 0,
        },
        lastClicked: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // find links that were clicked in the last 24 hours
        },
      },
      select: {
        id: true,
        programId: true,
        partnerId: true,
      },
    });

    if (!links.length) {
      return NextResponse.json({
        message: "No program links found. Skipping...",
      });
    }

    const now = new Date();

    // Set 'start' to the beginning of the previous day (00:00:00)
    const start = new Date(now);
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);

    // Set 'end' to the end of the previous day (23:59:59)
    const end = new Date(now);
    end.setDate(end.getDate() - 1);
    end.setHours(23, 59, 59, 999);

    let commissions: Prisma.CommissionUncheckedCreateInput[] =
      await Promise.all(
        links.map(async ({ id: linkId, programId, partnerId }) => {
          const { clicks: quantity } = await getAnalytics({
            start,
            end,
            linkId,
            groupBy: "count",
            event: "clicks",
          });

          return {
            linkId,
            programId: programId!,
            partnerId: partnerId!,
            type: EventType.click,
            quantity,
            amount: 0,
          };
        }),
      );

    commissions = commissions.filter((earning) => earning.amount > 0);

    console.log({ start, end, commissions });

    if (commissions.length) {
      await prisma.commission.createMany({
        data: commissions,
      });
    }

    return NextResponse.json({
      start,
      end,
      commissions,
    });
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
