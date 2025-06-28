import { getAnalytics } from "@/lib/analytics/get-analytics";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { createPartnerCommission } from "@/lib/partners/create-partner-commission";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * TODO: Use a cron job (similar to how we do it for usage cron) to account for the future where we have a lot of links to process
 */

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
        return NextResponse.json({
          message: "No links found. Skipping...",
        });
      }

      for (const { id: linkId, programId, partnerId } of links) {
        if (!linkId || !programId || !partnerId) {
          console.log("Invalid link", { linkId, programId, partnerId });
          continue;
        }

        const { clicks: quantity } = await getAnalytics({
          linkId,
          start,
          end,
          groupBy: "count",
          event: "clicks",
        });

        if (!quantity || quantity === 0) {
          console.log("No clicks found for link", {
            linkId,
            programId,
            partnerId,
          });
          continue;
        }

        console.log("Creating commission", {
          reward,
          event: "click",
          programId,
          partnerId,
          linkId,
          quantity,
        });

        await createPartnerCommission({
          reward,
          event: "click",
          programId,
          partnerId,
          linkId,
          quantity,
        });
      }
    }

    return NextResponse.json("OK");
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
