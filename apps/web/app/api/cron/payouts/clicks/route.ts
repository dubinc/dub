import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { createId } from "@/lib/api/utils";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { prisma } from "@dub/prisma";
import { Payout } from "@dub/prisma/client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// This route is used to calculate payouts for clicks.
// Runs once every day at 00:00 (0 0 * * *)
// GET /api/cron/payouts/clicks
export async function GET(req: Request) {
  try {
    await verifyVercelSignature(req);

    let clicks = await prisma.earnings.groupBy({
      by: ["programId", "partnerId"],
      where: {
        type: "click",
        status: "pending",
        payoutId: null,
      },
      _sum: {
        quantity: true,
      },
    });

    if (!clicks.length) {
      return NextResponse.json({
        message: "No pending clicks found. Skipping...",
      });
    }

    for (const { programId, partnerId } of clicks) {
      const payout = await createClickPayout({
        programId,
        partnerId,
      });

      console.log({
        programId,
        payout,
      });
    }

    return NextResponse.json({
      message: "Clicks payout created.",
    });
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}

const createClickPayout = async ({
  programId,
  partnerId,
}: {
  programId: string;
  partnerId: string;
}) => {
  const earnings = await prisma.$transaction(async (tx) => {
    const earnings = await tx.earnings.findMany({
      where: {
        programId,
        partnerId,
        payoutId: null,
        type: "click",
        status: "pending",
      },
      select: {
        id: true,
        createdAt: true,
        earnings: true,
        quantity: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (!earnings.length) {
      return;
    }

    // earliest click date
    const periodStart = earnings[0].createdAt;

    // end of the month of the latest click
    let periodEnd = earnings[earnings.length - 1].createdAt;
    periodEnd = new Date(periodEnd.getFullYear(), periodEnd.getMonth() + 1);

    const totalQuantity = earnings.reduce(
      (total, click) => total + click.quantity,
      0,
    );

    const totalAmount = earnings.reduce(
      (total, click) => total + click.earnings,
      0,
    );

    let payout: Payout | null = null;

    // check if the partner has another pending payout
    const existingPayout = await tx.payout.findFirst({
      where: {
        programId,
        partnerId,
        status: "pending",
        type: "clicks",
      },
    });

    if (existingPayout) {
      payout = await tx.payout.update({
        where: {
          id: existingPayout.id,
        },
        data: {
          amount: {
            increment: totalAmount,
          },
          quantity: {
            increment: totalQuantity,
          },
          periodEnd,
          description: existingPayout.description ?? "Dub Partners payout",
        },
      });
    } else {
      payout = await tx.payout.create({
        data: {
          id: createId({ prefix: "po_" }),
          programId,
          partnerId,
          periodStart,
          periodEnd,
          amount: totalAmount,
          quantity: totalQuantity,
          description: "Dub Partners payout",
          type: "clicks",
        },
      });
    }

    console.info("Payout created", payout);

    if (!payout) {
      throw new Error("Payout not created.");
    }

    // update the sales records
    await tx.earnings.updateMany({
      where: {
        id: {
          in: earnings.map(({ id }) => id),
        },
      },
      data: {
        status: "processed",
        payoutId: payout.id,
      },
    });

    return payout;
  });
};
