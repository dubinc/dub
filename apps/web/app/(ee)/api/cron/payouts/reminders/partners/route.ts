import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { sendBatchEmail } from "@dub/email";
import ConnectPayoutReminder from "@dub/email/templates/connect-payout-reminder";
import { prisma } from "@dub/prisma";
import { chunk } from "@dub/utils";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// This route is used to send reminders to partners who have pending payouts
// but haven't configured payouts yet.
// Runs once a day at 7AM PST but only notifies partners every 3 days
// GET /api/cron/payouts/reminders/partners
export async function GET(req: Request) {
  try {
    await verifyVercelSignature(req);

    const pendingPayouts = await prisma.payout.groupBy({
      by: ["partnerId", "programId"],
      where: {
        status: "pending",
        partner: {
          payoutsEnabledAt: null,
          OR: [
            { connectPayoutsLastRemindedAt: null },
            {
              connectPayoutsLastRemindedAt: {
                lte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // Last notified was at least 3 days ago
              },
            },
          ],
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

    if (!pendingPayouts.length) {
      return NextResponse.json("No action needed.");
    }

    const [partnerData, programData] = await Promise.all([
      prisma.partner.findMany({
        where: {
          id: {
            in: pendingPayouts.map((payout) => payout.partnerId),
          },
        },
      }),

      prisma.program.findMany({
        where: {
          id: {
            in: pendingPayouts.map((payout) => payout.programId),
          },
        },
      }),
    ]);

    const partnerProgramMap = new Map<
      string,
      {
        partner: {
          id: string;
          name: string;
          email: string;
        };
        programs: {
          id: string;
          name: string;
          logo: string;
          amount: number;
        }[];
      }
    >();

    for (const payout of pendingPayouts) {
      const { partnerId, programId } = payout;
      const { amount } = payout._sum;

      const partner = partnerData.find((p) => p.id === partnerId);
      const program = programData.find((p) => p.id === programId);

      if (!partner?.email || !program) {
        continue;
      }

      if (!partnerProgramMap.has(partnerId)) {
        partnerProgramMap.set(partnerId, {
          partner: {
            id: partner.id,
            name: partner.name,
            email: partner.email,
          },
          programs: [],
        });
      }

      partnerProgramMap.get(partnerId)!.programs.push({
        id: program.id,
        name: program.name,
        logo: program.logo!,
        amount: amount ?? 0,
      });
    }

    const partnerPrograms = Array.from(partnerProgramMap.values());
    const partnerProgramsChunks = chunk(partnerPrograms, 100);
    const connectPayoutsLastRemindedAt = new Date();

    for (const partnerProgramsChunk of partnerProgramsChunks) {
      await sendBatchEmail(
        partnerProgramsChunk.map(({ partner, programs }) => ({
          to: partner.email,
          subject: "Connect your payout details on Dub Partners",
          variant: "notifications",
          react: ConnectPayoutReminder({
            email: partner.email,
            programs,
          }),
        })),
      );

      console.info(partnerProgramsChunk);

      await prisma.partner.updateMany({
        where: {
          id: {
            in: partnerProgramsChunk.map(({ partner }) => partner.id),
          },
        },
        data: {
          connectPayoutsLastRemindedAt,
        },
      });
    }

    return NextResponse.json("OK");
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
