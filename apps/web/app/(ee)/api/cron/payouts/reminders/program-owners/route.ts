import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { INVOICE_MIN_PAYOUT_AMOUNT_CENTS } from "@/lib/constants/payouts";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { sendBatchEmail } from "@dub/email";
import ProgramPayoutReminder from "@dub/email/templates/program-payout-reminder";
import { prisma } from "@dub/prisma";
import { chunk, pluralize } from "@dub/utils";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/cron/payouts/reminders/program-owners
// This route is used to send reminders to program owners about pending payouts
// Runs every weekday at 1:00 PM UTC between 25th of current month and 5th of next month
// Cron expression: 0 13 25-31,1-5 * * (runs daily at 1:00 PM UTC on days 25-31 and 1-5, filtered for weekdays in code)
export async function GET(req: Request) {
  try {
    await verifyVercelSignature(req);

    // Only run on weekdays (Monday = 1, Friday = 5)
    const today = new Date();
    const dayOfWeek = today.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return NextResponse.json(
        "Skipping execution on weekend. Only runs on weekdays.",
      );
    }

    const programsWithCustomMinPayouts = await prisma.program.findMany({
      where: {
        minPayoutAmount: {
          gt: 0,
        },
      },
    });

    const pendingPayouts = await prisma.payout.groupBy({
      by: ["programId"],
      where: {
        status: "pending",
        amount: {
          gt: 0,
        },
        programId: {
          notIn: programsWithCustomMinPayouts.map((p) => p.id),
        },
        partner: {
          payoutsEnabledAt: {
            not: null,
          },
        },
      },
      _sum: {
        amount: true,
      },
      _count: {
        _all: true,
      },
    });

    for (const program of programsWithCustomMinPayouts) {
      console.log(
        `Manually calculating pending payout for program ${program.id} which has a custom min payout amount of ${program.minPayoutAmount}`,
      );

      const pendingPayout = await prisma.payout.aggregate({
        where: {
          programId: program.id,
          status: "pending",
          amount: {
            gte: program.minPayoutAmount,
          },
          partner: {
            payoutsEnabledAt: {
              not: null,
            },
          },
        },
        _sum: {
          amount: true,
        },
        _count: {
          _all: true,
        },
      });

      // if there are no pending payouts, skip this program
      if (!pendingPayout._sum?.amount) {
        continue;
      }

      pendingPayouts.push({
        programId: program.id,
        _sum: pendingPayout._sum,
        _count: pendingPayout._count,
      });
    }

    if (!pendingPayouts.length) {
      return NextResponse.json("No pending payouts found. Skipping...");
    }

    const recentPaidInvoices = await prisma.invoice.findMany({
      where: {
        programId: {
          in: pendingPayouts.map((p) => p.programId),
        },
        // take invoices from the last 2 weeks
        createdAt: {
          gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        },
      },
    });

    // only send notifications for programs that:
    // - have a total payout amount greater than or equal to $10 (INVOICE_MIN_PAYOUT_AMOUNT_CENTS)
    // - have not paid out any invoices in the last 2 weeks
    const payoutsToNotify = pendingPayouts.filter((p) => {
      const invoiceTotal = p._sum?.amount ?? 0;
      const recentPaidInvoicesForProgram = recentPaidInvoices.filter(
        (i) => i.programId === p.programId,
      );
      return (
        invoiceTotal >= INVOICE_MIN_PAYOUT_AMOUNT_CENTS ||
        recentPaidInvoicesForProgram.length === 0
      );
    });

    const programs = await prisma.program.findMany({
      where: {
        id: {
          in: payoutsToNotify.map((p) => p.programId),
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

    const programsWithPendingPayoutsToNotify = await Promise.all(
      programs.map(async (program) => {
        const payoutDetails = payoutsToNotify.find(
          (p) => p.programId === program.id,
        );

        const workspace = program.workspace;

        return workspace.users.map(({ user }) => ({
          workspace: {
            slug: workspace.slug,
          },
          user: {
            email: user.email,
          },
          program: {
            name: program.name,
          },
          payout: {
            amount: payoutDetails?._sum?.amount ?? 0,
            partnersCount: payoutDetails?._count?._all ?? 0,
          },
        }));
      }),
    ).then((p) => p.flat());

    console.table(programsWithPendingPayoutsToNotify);

    const programOwnerChunks = chunk(programsWithPendingPayoutsToNotify, 100);

    for (const programOwnerChunk of programOwnerChunks) {
      const res = await sendBatchEmail(
        programOwnerChunk.map(({ workspace, user, program, payout }) => ({
          variant: "notifications",
          to: user.email!,
          subject: `${payout.partnersCount} ${pluralize(
            "partner",
            payout.partnersCount,
          )} awaiting your payout for ${program.name}`,
          react: ProgramPayoutReminder({
            email: user.email!,
            workspace,
            program,
            payout,
          }),
        })),
      );

      console.log(`Sent ${programOwnerChunk.length} emails`, res);
    }

    return NextResponse.json("OK");
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
