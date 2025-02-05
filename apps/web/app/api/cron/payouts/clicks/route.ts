import { getAnalytics } from "@/lib/analytics/get-analytics";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { prisma } from "@dub/prisma";
import { EventType, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/*
    This route is used aggregate clicks events on daily basis for Program links
    Runs once every day at 00:00 (0 0 * * *)
*/

// GET /cron/payouts/clicks
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
      },
      select: {
        id: true,
        programId: true,
        partnerId: true,
      },
      take: 10,
    });

    if (!links.length) {
      return NextResponse.json({
        message: "No program links found. Skipping...",
      });
    }

    // Find the start of the today and end current time
    // TODO: Fix this
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();

    // TODO:
    // Use queue to process clicks
    const clicksData: Prisma.EarningsUncheckedCreateInput[] = await Promise.all(
      links.map(async ({ id: linkId, programId, partnerId }) => {
        const { clicks } = await getAnalytics({
          start,
          end,
          linkId,
          groupBy: "count",
          event: "clicks",
        });

        return {
          linkId,
          quantity: clicks,
          programId: programId!,
          partnerId: partnerId!,
          type: EventType.click,
          amount: 0,
        };
      }),
    );

    await prisma.earnings.createMany({
      data: clicksData,
    });

    return NextResponse.json(clicksData);
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
