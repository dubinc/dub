import { prisma } from "@/lib/prisma";
import { ProgramEnrollmentStatus } from "@prisma/client";

const STATUS_LOG_ACTIONS = {
  deactivated: "partner.deactivated",
  archived: "partner.archived",
} as const;

// When each enrollment became inactive, by program ID.
// A ban has bannedAt. Deactivations and archives have no date column, so the date comes from the
// latest activity log of that status, which exists only for changes made since activity logs were added.
// The log lookup is a query, so callers turn it on only when they show these dates.
export async function getProgramEnrollmentInactiveDates({
  partnerId,
  programEnrollments,
  includeStatusLogs,
}: {
  partnerId: string;
  includeStatusLogs: boolean;
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

  if (!includeStatusLogs) {
    return inactiveDates;
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

  // the logs are newest first, so the first log per program and action is the latest change
  const latestLogDates = new Map<string, Date>();

  for (const { programId, action, createdAt } of statusLogs) {
    const key = `${programId}:${action}`;

    if (!latestLogDates.has(key)) {
      latestLogDates.set(key, createdAt);
    }
  }

  for (const { programId, status } of loggedEnrollments) {
    const loggedAt = latestLogDates.get(
      `${programId}:${STATUS_LOG_ACTIONS[status]}`,
    );

    if (loggedAt) {
      inactiveDates.set(programId, loggedAt);
    }
  }

  return inactiveDates;
}
