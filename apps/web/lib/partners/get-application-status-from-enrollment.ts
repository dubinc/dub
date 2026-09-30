import {
  ProgramApplicationStatus,
  ProgramEnrollmentStatus,
} from "@prisma/client";

export function getApplicationStatusFromEnrollment(
  enrollmentStatus: ProgramEnrollmentStatus,
): ProgramApplicationStatus {
  if (enrollmentStatus === ProgramEnrollmentStatus.pending) {
    return ProgramApplicationStatus.pending;
  }

  if (enrollmentStatus === ProgramEnrollmentStatus.rejected) {
    return ProgramApplicationStatus.rejected;
  }

  return ProgramApplicationStatus.approved;
}
