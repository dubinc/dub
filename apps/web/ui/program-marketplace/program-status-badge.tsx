"use client";

import {
  evaluateApplicationRequirements,
  getEligibilityContext,
} from "@/lib/partners/evaluate-application-requirements";
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
  variant: "neutral" as const,
  className: "text-neutral-600 bg-neutral-100",
  icon: Lock,
  label: "Not eligible",
};

export function ProgramStatusBadge({
  program,
}: {
  program: Pick<NetworkProgramProps, "slug" | "applicationRequirements">;
}) {
  const { programEnrollments, isLoading: programEnrollmentsLoading } =
    useProgramEnrollments();
  const { partner, loading: partnerLoading } = usePartnerProfile();

  const programEnrollmentStatus = programEnrollments?.find(
    (programEnrollment) => programEnrollment.program.slug === program.slug,
  )?.status;

  // Eligibility can't be evaluated until both the partner profile and their
  // enrollment statuses have loaded
  const eligibilityLoading = partnerLoading || programEnrollmentsLoading;

  const { reason } = evaluateApplicationRequirements({
    applicationRequirements: program.applicationRequirements,
    context: getEligibilityContext({
      partner,
      programEnrollmentStatuses: programEnrollments?.map(
        ({ status }) => status,
      ),
    }),
  });

  const statusBadge = programEnrollmentStatus
    ? ProgramNetworkStatusBadges[programEnrollmentStatus]
    : !eligibilityLoading && reason === "requirementsNotMet"
      ? notEligibleBadge
      : null;

  return statusBadge ? (
    <StatusBadge {...statusBadge} className="px-1.5 py-0.5">
      {statusBadge.label}
    </StatusBadge>
  ) : null;
}
