import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { limiter } from "@/lib/cron/limiter";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { sendEmail } from "@dub/email";
import ProgramPayoutReminder from "@dub/email/templates/program-payout-reminder";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// This route is used to send reminders to program owners about pending payouts
// Runs on the 24th day of the month at 9:00 AM
// GET /api/cron/payouts/reminders/program-owners
export async function GET(req: Request) {
  try {
    await verifyVercelSignature(req);

    const payouts = await prisma.payout.groupBy({
      by: ["programId"],
      where: {
        status: "pending",
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

    const payoutsMap = new Map(payouts.map((p) => [p.programId, p]));

    const programsWithPayouts = programs
      .map((program) => {
        const payout = payoutsMap.get(program.id);
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
            amount: payout?._sum?.amount ?? 0,
            partnersCount: payout?._count?._all ?? 0,
          },
        }));
      })
      .flat();

    await Promise.all(
      programsWithPayouts.map(({ workspace, user, program, payout }) =>
        limiter.schedule(() =>
          sendEmail({
            subject: `Payouts ready to be confirmed for ${program.name}`,
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

    return NextResponse.json(`Sent reminders for ${programs.length} programs.`);
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
