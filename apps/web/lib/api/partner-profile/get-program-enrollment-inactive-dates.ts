import { prisma } from "@/lib/prisma";
import { ProgramEnrollmentStatus } from "@prisma/client";

const STATUS_LOG_ACTIONS = {
  deactivated: "partner.deactivated",
  archived: "partner.archived",
} as const;

// When each enrollment became inactive, by program ID.
// A ban has bannedAt. Deactivations and archives have no date column, so the date comes from the
// latest activity log of that status, which exists only for changes made since activity logs were added.
export async function getProgramEnrollmentInactiveDates({
  partnerId,
  programEnrollments,
}: {
  partnerId: string;
  programEnrollments: {
    programId: string;
    status: ProgramEnrollmentStatus;
    bannedAt: Date | null;
  }[];
}) {
  const inactiveDates = new Map<string, Date>();

  for (const { programId, status, bannedAt } of programEnrollments) {
    if (status === "banned" && bannedAt) {
      inactiveDates.set(programId, bannedAt);
    }
  }

  const loggedEnrollments = programEnrollments.filter(
    (
      enrollment,
    ): enrollment is typeof enrollment & {
      status: keyof typeof STATUS_LOG_ACTIONS;
    } => enrollment.status in STATUS_LOG_ACTIONS,
  );

  if (loggedEnrollments.length === 0) {
    return inactiveDates;
  }

  const statusLogs = await prisma.activityLog.findMany({
    where: {
      resourceType: "partner",
      resourceId: partnerId,
      programId: {
        in: loggedEnrollments.map(({ programId }) => programId),
      },
      action: {
        in: Object.values(STATUS_LOG_ACTIONS),
      },
    },
    select: {
      programId: true,
      action: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  for (const { programId, status } of loggedEnrollments) {
    // the logs are newest first, so this is the latest change to the current status
    const statusLog = statusLogs.find(
      (log) =>
        log.programId === programId &&
        log.action === STATUS_LOG_ACTIONS[status],
    );

    if (statusLog) {
      inactiveDates.set(programId, statusLog.createdAt);
    }
  }

  return inactiveDates;
}
