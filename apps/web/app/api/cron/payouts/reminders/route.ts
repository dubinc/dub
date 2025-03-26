import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// This route is used to send reminders to partners who have pending payouts
// but haven't configured payouts yet.
// Runs once every 3 days
// GET /api/cron/payouts/reminders
export async function GET(req: Request) {
  try {
    await verifyVercelSignature(req);

    const pendingPayouts = await prisma.payout.groupBy({
      by: ["partnerId", "programId"],
      where: {
        status: "pending",
        partner: {
          payoutsEnabledAt: null,
        },
      },
      _sum: {
        amount: true,
      },
      orderBy: {
        _sum: {
          amount: "desc",
        },
      },
    });

    const partnerData = await prisma.partner.findMany({
      where: {
        id: {
          in: pendingPayouts.map((payout) => payout.partnerId),
        },
      },
    });

    const programData = await prisma.program.findMany({
      where: {
        id: {
          in: pendingPayouts.map((payout) => payout.programId),
        },
      },
    });

    const partnerPrograms = pendingPayouts.reduce(
      (acc, payout) => {
        const { partnerId, programId } = payout;
        const { amount } = payout._sum;

        const partner = partnerData.find((p) => p.id === partnerId);
        const program = programData.find((p) => p.id === programId);
        if (!partner?.email || !program) {
          return acc;
        }

        acc[partner.email] = acc[partner.email] || [];
        acc[partner.email].push({
          amount: amount ?? 0,
          partner: {
            name: partner.name,
            email: partner.email,
          },
          program: {
            name: program.name,
          },
        });
        return acc;
      },
      {} as Record<
        string,
        Array<{ amount: number; partner: any; program: any }>
      >,
    );

    return NextResponse.json(partnerPrograms);
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
