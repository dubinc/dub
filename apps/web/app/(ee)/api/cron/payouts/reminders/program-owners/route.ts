import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { limiter } from "@/lib/cron/limiter";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { DUB_MIN_PAYOUT_AMOUNT_CENTS } from "@/lib/partners/constants";
import { sendEmail } from "@dub/email";
import { ProgramPayoutReminder } from "@dub/email/templates/program-payout-reminder";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// This route is used to send reminders to program owners about pending payouts
// Runs on the 24th day of the month at 9:00 AM
// GET /api/cron/payouts/reminders/program-owners
export async function GET(req: Request) {
  try {
    await verifyVercelSignature(req);

    const programsWithCustomMinPayouts = await prisma.program.findMany({
      where: {
        minPayoutAmount: {
          gt: DUB_MIN_PAYOUT_AMOUNT_CENTS,
        },
      },
    });

    const payouts = await prisma.payout.groupBy({
      by: ["programId"],
      where: {
        status: "pending",
        amount: {
          gte: DUB_MIN_PAYOUT_AMOUNT_CENTS,
        },
        programId: {
          notIn: programsWithCustomMinPayouts.map((p) => p.id),
        },
      },
      _sum: {
        amount: true,
      },
      _count: {
        _all: true,
      },
    });

    if (!payouts.length) {
      return NextResponse.json("No pending payouts found. Skipping...");
    }

    const programs = await prisma.program.findMany({
      where: {
        id: {
          in: payouts.map((p) => p.programId),
        },
      },
      include: {
        workspace: {
          select: {
            id: true,
            slug: true,
            users: {
              where: {
                role: "owner",
              },
              select: {
                user: {
                  select: {
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!programs.length) {
      return NextResponse.json("No programs found. Skipping...");
    }

    const programsWithPayouts = await Promise.all(
      programs.map(async (program) => {
        let payoutDetails = payouts.find((p) => p.programId === program.id);

        if (!payoutDetails) {
          const pendingPayouts = await prisma.payout.aggregate({
            where: {
              programId: program.id,
              status: "pending",
              amount: {
                gte: program.minPayoutAmount,
              },
            },
            _sum: {
              amount: true,
            },
            _count: {
              _all: true,
            },
          });

          payoutDetails = pendingPayouts[0];
        }

        const workspace = program.workspace;

        return workspace.users.map(({ user }) => ({
          workspace: {
            slug: workspace.slug,
          },
          user: {
            email: user.email,
          },
          program: {
            id: program.id,
            name: program.name,
          },
          payout: {
            amount: payoutDetails?._sum?.amount ?? 0,
            partnersCount: payoutDetails?._count?._all ?? 0,
          },
        }));
      }),
    ).then((p) => p.flat());

    await Promise.all(
      programsWithPayouts.map(({ workspace, user, program, payout }) =>
        limiter.schedule(() =>
          sendEmail({
            subject: `${payout.partnersCount} partners awaiting your payout for ${program.name}`,
            email: user.email!,
            react: ProgramPayoutReminder({
              email: user.email!,
              workspace,
              program,
              payout,
            }),
            variant: "notifications",
          }),
        ),
      ),
    );

    return NextResponse.json(
      `Sent reminders for ${programsWithPayouts.length} programs.`,
    );
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
