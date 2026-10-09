import { STANDARD_REAPPLICATION_DAYS } from "@dub/utils";
import {
  ProgramEnrollment,
  ProgramEnrollmentStatus,
  ReapplicationTimeframe,
} from "@prisma/client";
import { addDays } from "date-fns";

/**
 * Throws if the partner's existing enrollment prevents a new application to `groupId`.
 *
 * Approved partners applying to another group are held to the stored
 * `reapplicationTimeframe`, measured from `rejectedAt` (the `reviewedAt` of the
 * latest application reviewed since enrollment, if it was rejected). Omit
 * `rejectedAt` to skip that window.
 */
export function throwIfApplicationBlocked({
  enrollment,
  groupId,
  rejectedAt,
}: {
  enrollment:
    | Pick<ProgramEnrollment, "status" | "groupId" | "reapplicationTimeframe">
    | null
    | undefined;
  groupId: string; // New group ID the partner is applying to
  rejectedAt?: Date | null; // Last application rejection date
}) {
  if (!enrollment) {
    return;
  }

  switch (enrollment.status) {
    case ProgramEnrollmentStatus.pending:
      throw new Error(
        "You have an existing application for this program. Please wait for it to be reviewed.",
      );
    case ProgramEnrollmentStatus.rejected:
      if (enrollment.reapplicationTimeframe === ReapplicationTimeframe.never) {
        throw new Error("You cannot reapply to this program.");
      }

      // TODO: Improve this message to use the absolute day remaining.
      if (
        enrollment.reapplicationTimeframe === ReapplicationTimeframe.standard
      ) {
        throw new Error(
          `You can reapply to this program after ${STANDARD_REAPPLICATION_DAYS} days.`,
        );
      }

      // An instant rejection deletes the enrollment, so a rejected one should not
      // exist here. Block it, because the upsert would leave it rejected.
      throw new Error(
        "You have already applied to this program. You cannot apply to this program again.",
      );
    case ProgramEnrollmentStatus.invited:
      throw new Error("You have a pending invitation to join this program.");
    case ProgramEnrollmentStatus.declined:
      throw new Error(
        "You have declined your invitation to join this program. Please contact program owner to re-invite you.",
      );
    case ProgramEnrollmentStatus.approved:
      if (enrollment.groupId === groupId) {
        throw new Error("You're already in this group.");
      }

      if (
        !rejectedAt ||
        enrollment.reapplicationTimeframe === ReapplicationTimeframe.instant
      ) {
        return;
      }

      if (enrollment.reapplicationTimeframe === ReapplicationTimeframe.never) {
        throw new Error("You cannot reapply to this program.");
      }

      if (addDays(rejectedAt, STANDARD_REAPPLICATION_DAYS) > new Date()) {
        throw new Error(
          `You can reapply to this program after ${STANDARD_REAPPLICATION_DAYS} days.`,
        );
      }
      return;
    default:
      throw new Error(
        `You cannot apply to this program again because your enrollment is ${enrollment.status}.`,
      );
  }
}
