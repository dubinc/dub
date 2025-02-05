import { getAnalytics } from "@/lib/analytics/get-analytics";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { prisma } from "@dub/prisma";
import { EventType, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// TODO:
// Let's use a cron job (similar to how we do it for usage cron) to account for the future where we have a lot of links to process
// Check if CPC is enabled for the link

// This route is used aggregate clicks events on daily basis for Program links and add to the Earnings table
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

    let earnings: Prisma.EarningsUncheckedCreateInput[] = await Promise.all(
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

    earnings = earnings.filter((earning) => earning.amount > 0);

    console.log({ start, end, earnings });

    if (earnings.length) {
      await prisma.earnings.createMany({
        data: earnings,
      });
    }

    return NextResponse.json({
      start,
      end,
      earnings,
    });
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
