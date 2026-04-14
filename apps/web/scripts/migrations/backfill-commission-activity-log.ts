import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { addDays } from "date-fns";
import "dotenv-flow/config";

const BATCH_SIZE = 500;
const TERMINAL_STATUSES = ["refunded", "duplicate", "fraud", "canceled"];

async function main() {
  let cursor: string | undefined = undefined;
  let totalProcessed = 0;
  let totalLogsCreated = 0;

  while (true) {
    const commissions = await prisma.commission.findMany({
      where: {
        status: {
          not: "pending",
        },
        earnings: {
          not: 0,
        },
      },
      include: {
        program: {
          select: {
            workspaceId: true,
          },
        },
        programEnrollment: {
          select: {
            partnerGroup: {
              select: {
                holdingPeriodDays: true,
              },
            },
          },
        },
        payout: {
          select: {
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

    const existingActivityLogs = await prisma.activityLog.findMany({
      where: {
        resourceType: "commission",
        resourceId: {
          in: commissions.map((c) => c.id),
        },
      },
    });

    const activityLogs: Prisma.ActivityLogCreateManyInput[] = [];

    for (const commission of commissions) {
      const { amount, earnings, status, program, programEnrollment } =
        commission;

      const existingActivityLogsForCommission = existingActivityLogs.filter(
        (log) => log.resourceId === commission.id,
      );
      if (existingActivityLogsForCommission.length > 0) {
        console.log(
          `Commission ${commission.id} already has ${existingActivityLogsForCommission.length} activity logs, skipping...`,
        );
        continue;
      }

      const base = {
        workspaceId: program.workspaceId,
        programId: commission.programId,
        resourceType: "commission",
        resourceId: commission.id,
      };

      const statusBecameProcessed =
        commission.type === "custom"
          ? commission.createdAt
          : addDays(
              commission.createdAt,
              programEnrollment?.partnerGroup?.holdingPeriodDays ?? 0,
            );

      if (TERMINAL_STATUSES.includes(status)) {
        if (!commission.rewardId) {
          console.log(
            `Commission ${commission.id} with status ${status} has no rewardId, likely imported from another source, skipping...`,
          );
          continue;
        }

        let statusBeforeTerminal = "pending";
        // if the status became processed before it was updated to terminal
        // we should include the processed activity log
        if (statusBecameProcessed < commission.updatedAt) {
          activityLogs.push({
            ...base,
            action: "commission.updated",
            createdAt: statusBecameProcessed,
            changeSet: {
              commission: {
                old: { amount, earnings, status: "pending" },
                new: { amount, earnings, status: "processed" },
              },
            },
          });
          statusBeforeTerminal = "processed";
        }

        activityLogs.push({
          ...base,
          action: "commission.updated",
          createdAt: commission.updatedAt,
          changeSet: {
            commission: {
              old: { amount, earnings, status: statusBeforeTerminal },
              new: { amount, earnings, status },
            },
          },
        });
      } else {
        if (status === "paid" && !commission.payout) {
          console.log(
            `Commission ${commission.id} is paid but has no payout, likely imported from another source, skipping...`,
          );
          continue;
        }

        const commissionPaidAt = commission.payout?.paidAt;

        // pending → processed
        activityLogs.push({
          ...base,
          action: "commission.updated",
          // if commissionPaidAt exists and is before statusBecameProcessed, use commission.createdAt
          // otherwise use statusBecameProcessed
          createdAt:
            commissionPaidAt && commissionPaidAt < statusBecameProcessed
              ? commission.createdAt
              : statusBecameProcessed,
          changeSet: {
            commission: {
              old: { amount, earnings, status: "pending" },
              new: { amount, earnings, status: "processed" },
            },
          },
        });

        // this should be there but just in case
        if (commission.payout?.paidAt) {
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
        }
      }
    }

    let logsCreated = 0;

    if (activityLogs.length > 0) {
      const created = await prisma.activityLog.createMany({
        data: activityLogs,
        skipDuplicates: true,
      });
      logsCreated = created.count;
      totalLogsCreated += logsCreated;
    }

    totalProcessed += commissions.length;

    console.log(
      `Batch done: ${commissions.length} commissions, ${activityLogs.length} logs created. Total processed: ${totalProcessed}, total logs: ${totalLogsCreated}`,
    );
  }

  console.log(
    `\nBackfill complete. Processed ${totalProcessed} commissions, created ${totalLogsCreated} activity logs.`,
  );
}

main();
