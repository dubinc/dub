import { formatDate, STANDARD_REAPPLICATION_DAYS } from "@dub/utils";
import type {
  ProgramEnrollmentStatus,
  ReapplicationTimeframe,
} from "@prisma/client";
import { addDays } from "date-fns";

/**
 * Returns why a rejected partner cannot apply to the program again yet, or
 * null if they can. Safe to use on the client.
 */
export function getReapplicationBlockedReason({
  reapplicationTimeframe,
  rejectedAt,
}: {
  reapplicationTimeframe: ReapplicationTimeframe | null | undefined;
  rejectedAt?: Date | string | null; // When the rejection was reviewed
}) {
  if (reapplicationTimeframe === "never") {
    return "You cannot reapply to this program.";
  }

  if (reapplicationTimeframe !== "standard") {
    return null;
  }

  if (!rejectedAt) {
    return `You can reapply to this program ${STANDARD_REAPPLICATION_DAYS} days after the rejection.`;
  }

  const reapplyAt = addDays(new Date(rejectedAt), STANDARD_REAPPLICATION_DAYS);

  if (reapplyAt > new Date()) {
    return `You can reapply to this program on ${formatDate(reapplyAt)}.`;
  }

  return null;
}

/**
 * Whether the partner can reapply to a program now, and why not if they were
 * rejected and cannot reapply yet.
 */
export function getReapplyStatus({
  status,
  reapplicationTimeframe,
  application,
}: {
  status: ProgramEnrollmentStatus;
  reapplicationTimeframe?: ReapplicationTimeframe | null;
  application?: { reviewedAt?: Date | string | null } | null;
}) {
  if (status !== "rejected") {
    return { canReapply: false, blockedReason: null };
  }

  const blockedReason = getReapplicationBlockedReason({
    reapplicationTimeframe,
    rejectedAt: application?.reviewedAt,
  });

  return { canReapply: !blockedReason, blockedReason };
}
