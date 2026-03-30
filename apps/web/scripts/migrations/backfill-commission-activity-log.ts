import "dotenv-flow/config";

import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";

const BATCH_SIZE = 500;
const TERMINAL_STATUSES = ["refunded", "duplicate", "fraud", "canceled"];

// REMOVE before running:
// - "server-only" from any imported files if needed

// Note: Activity log createdAt is not accurate, but it's the best we can do

async function main() {
  const programId = process.env.PROGRAM_ID;

  let cursor: string | undefined = undefined;
  let totalProcessed = 0;
  let totalLogsCreated = 0;

  console.log(
    `Starting commission activity log backfill${programId ? ` for program ${programId}` : ""}...`,
  );

  while (true) {
    const commissions = await prisma.commission.findMany({
      where: {
        ...(programId ? { programId } : {}),
      },
      include: {
        program: {
          select: {
            workspaceId: true,
          },
        },
        payout: {
          select: {
            createdAt: true,
            paidAt: true,
          },
        },
      },
      orderBy: {
        id: "asc",
      },
      take: BATCH_SIZE,
      ...(cursor
        ? {
            skip: 1,
            cursor: {
              id: cursor,
            },
          }
        : {}),
    });

    if (commissions.length === 0) {
      break;
    }

    cursor = commissions[commissions.length - 1].id;

    const commissionsToBackfill = commissions.filter((c) => c.id);

    if (commissionsToBackfill.length === 0) {
      totalProcessed += commissions.length;
      console.log(
        `Batch skipped (all have logs). Total processed: ${totalProcessed}`,
      );
      continue;
    }

    const activityLogs: Prisma.ActivityLogCreateManyInput[] = [];

    for (const commission of commissionsToBackfill) {
      const { amount, earnings, status, program } = commission;

      const base = {
        workspaceId: program.workspaceId,
        programId: commission.programId,
        resourceType: "commission",
        resourceId: commission.id,
      };

      if (status === "processed") {
        activityLogs.push({
          ...base,
          action: "commission.updated",
          createdAt: commission.payout?.createdAt,
          changeSet: {
            commission: {
              old: {
                amount,
                earnings,
                status: "pending",
              },
              new: {
                amount,
                earnings,
                status: "processed",
              },
            },
          },
        });

        continue;
      }

      if (status === "paid") {
        // pending → processed
        activityLogs.push({
          ...base,
          action: "commission.updated",
          createdAt: commission.payout?.createdAt,
          changeSet: {
            commission: {
              old: {
                amount,
                earnings,
                status: "pending",
              },
              new: {
                amount,
                earnings,
                status: "processed",
              },
            },
          },
        });

        // processed → paid
        activityLogs.push({
          ...base,
          action: "commission.updated",
          createdAt: commission.payout?.paidAt,
          changeSet: {
            commission: {
              old: {
                amount,
                earnings,
                status: "processed",
              },
              new: {
                amount,
                earnings,
                status: "paid",
              },
            },
          },
        });

        continue;
      }

      if (TERMINAL_STATUSES.includes(status)) {
        activityLogs.push({
          ...base,
          action: "commission.updated",
          createdAt: commission.updatedAt,
          changeSet: {
            commission: {
              old: { amount, earnings, status: "pending" },
              new: { amount, earnings, status },
            },
          },
        });
      }
    }

    if (activityLogs.length > 0) {
      await prisma.activityLog.createMany({
        data: activityLogs,
        skipDuplicates: true,
      });
    }

    totalProcessed += commissions.length;
    totalLogsCreated += activityLogs.length;

    console.log(
      `Batch done: ${commissionsToBackfill.length} commissions, ${activityLogs.length} logs created. Total processed: ${totalProcessed}, total logs: ${totalLogsCreated}`,
    );
  }

  console.log(
    `\nBackfill complete. Processed ${totalProcessed} commissions, created ${totalLogsCreated} activity logs.`,
  );
}

main();
