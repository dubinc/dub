"use client";

import { evaluateApplicationRequirements } from "@/lib/partners/evaluate-application-requirements";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import useProgramEnrollments from "@/lib/swr/use-program-enrollments";
import { NetworkProgramProps } from "@/lib/types";
import { PartnerStatusBadges } from "@/ui/partners/partner-status-badges";
import { StatusBadge } from "@dub/ui";
import { Lock } from "@dub/ui/icons";

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

const notEligibleBadge = {
  variant: "new" as const,
  className: "text-blue-600 bg-blue-100",
  icon: Lock,
  label: "Not eligible",
};

export function ProgramStatusBadge({
  program,
}: {
  program: Pick<NetworkProgramProps, "slug" | "applicationRequirements">;
}) {
  const { programEnrollments } = useProgramEnrollments();
  const { partner } = usePartnerProfile();

  const programEnrollmentStatus = programEnrollments?.find(
    (programEnrollment) => programEnrollment.program.slug === program.slug,
  )?.status;

  const { reason } = evaluateApplicationRequirements({
    applicationRequirements: program.applicationRequirements,
    context: {
      country: partner?.country,
      email: partner?.email,
    },
  });

  const statusBadge = programEnrollmentStatus
    ? ProgramNetworkStatusBadges[programEnrollmentStatus]
    : reason === "requirementsNotMet"
      ? notEligibleBadge
      : null;

  return statusBadge ? (
    <StatusBadge {...statusBadge} className="px-1.5 py-0.5">
      {statusBadge.label}
    </StatusBadge>
  ) : null;
}
