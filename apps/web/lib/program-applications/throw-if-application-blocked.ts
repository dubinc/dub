import {
  ProgramEnrollment,
  ProgramEnrollmentStatus,
  ReapplicationTimeframe,
} from "@prisma/client";
import { getReapplicationBlockedReason } from "./reapplication";

/**
 * Throws if the partner's existing enrollment prevents a new application to `groupId`.
 *
 * Rejected and approved partners are held to the stored `reapplicationTimeframe`,
 * measured from `rejectedAt`. For a rejected enrollment, pass the rejection date.
 * For an approved partner applying to another group, pass the `reviewedAt` of the
 * latest application reviewed since enrollment, if it was rejected. Omit
 * `rejectedAt` to skip that window for an approved partner.
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
    case ProgramEnrollmentStatus.rejected: {
      // An instant rejection deletes the enrollment, so a rejected one should not
      // exist here. Block it, because the upsert would leave it rejected.
      if (
        enrollment.reapplicationTimeframe === ReapplicationTimeframe.instant
      ) {
        throw new Error(
          "You have already applied to this program. You cannot apply to this program again.",
        );
      }

      const blockedReason = getReapplicationBlockedReason({
        reapplicationTimeframe: enrollment.reapplicationTimeframe,
        rejectedAt,
      });

      if (blockedReason) {
        throw new Error(blockedReason);
      }
      return;
    }
    case ProgramEnrollmentStatus.invited:
      throw new Error("You have a pending invitation to join this program.");
    case ProgramEnrollmentStatus.declined:
      throw new Error(
        "You have declined your invitation to join this program. Please contact program owner to re-invite you.",
      );
    case ProgramEnrollmentStatus.approved: {
      if (enrollment.groupId === groupId) {
        throw new Error("You're already in this group.");
      }

      if (!rejectedAt) {
        return;
      }

      const blockedReason = getReapplicationBlockedReason({
        reapplicationTimeframe: enrollment.reapplicationTimeframe,
        rejectedAt,
      });

      if (blockedReason) {
        throw new Error(blockedReason);
      }
      return;
    }
    default:
      throw new Error(
        `You cannot apply to this program again because your enrollment is ${enrollment.status}.`,
      );
  }
}
