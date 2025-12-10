"use client";

import useProgramEnrollments from "@/lib/swr/use-program-enrollments";
import { NetworkProgramProps } from "@/lib/types";
import { PartnerStatusBadges } from "@/ui/partners/partner-status-badges";
import { StatusBadge } from "@dub/ui";

export const ProgramNetworkStatusBadges = {
  ...PartnerStatusBadges,
  approved: {
    ...PartnerStatusBadges.approved,
    label: "Enrolled",
  },
  pending: {
    ...PartnerStatusBadges.pending,
    label: "Applied",
  },
};

export function ProgramStatusBadge({
  program,
}: {
  program: Pick<NetworkProgramProps, "slug">;
}) {
  const { programEnrollments } = useProgramEnrollments();
  const programEnrollmentStatus = programEnrollments?.find(
    (programEnrollment) => programEnrollment.program.slug === program.slug,
  )?.status;

  const statusBadge = programEnrollmentStatus
    ? ProgramNetworkStatusBadges[programEnrollmentStatus]
    : null;

  return statusBadge ? (
    <StatusBadge {...statusBadge} className="px-1.5 py-0.5">
      {statusBadge.label}
    </StatusBadge>
  ) : null;
}
