"use client";

import { evaluateApplicationRequirements } from "@/lib/partners/evaluate-application-requirements";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import {
  DiscountProps,
  GroupBountySummaryProps,
  ProgramProps,
  RewardProps,
} from "@/lib/types";
import { applicationRequirementsSchema } from "@/lib/zod/schemas/programs";
import { LanderRewards } from "@/ui/partners/lander/lander-rewards";
import { PartnerStatusBadges } from "@/ui/partners/partner-status-badges";
import { useProgramApplicationSheet } from "@/ui/partners/program-application-sheet";
import { ProgramEligibilityCard } from "@/ui/partners/program-eligibility-card";
import { BlurImage, Button, CircleCheck, Link4, StatusBadge } from "@dub/ui";
import { capitalize, cn, OG_AVATAR_URL } from "@dub/utils";
import { redirect } from "next/navigation";
import { useMemo, useState } from "react";

export function ProgramSidebar({
  program,
  applicationRewards,
  applicationDiscount,
}: {
  program: ProgramProps & {
    group?: {
      id: string;
      bounties?: GroupBountySummaryProps[];
    } | null;
  };
  applicationRewards: RewardProps[];
  applicationDiscount: DiscountProps | null;
}) {
  const { partner } = usePartnerProfile();
  const { programEnrollment } = useProgramEnrollment({
    swrOpts: {
      keepPreviousData: true,
      shouldRetryOnError: (err) => err.status !== 404,
      revalidateOnFocus: false,
    },
  });

  const applicationRequirements = program.applicationRequirements
    ? applicationRequirementsSchema.parse(program.applicationRequirements)
    : null;

  const { reason } = evaluateApplicationRequirements({
    applicationRequirements,
    context: {
      country: partner?.country,
      email: partner?.email,
      identityVerificationStatus: partner?.identityVerificationStatus,
    },
  });

  const requirementsNotMet =
    reason === "requirementsNotMet"
      ? "You do not meet the eligibility requirements for this program"
      : undefined;

  const statusBadge = programEnrollment
    ? {
        ...PartnerStatusBadges,
        pending: {
          ...PartnerStatusBadges.pending,
          label: "Applied",
        },
      }[programEnrollment.status]
    : null;

  const [justApplied, setJustApplied] = useState(false);

  const buttonText = useMemo(() => {
    if (justApplied) return "Applied";
    if (!programEnrollment) return "Apply";

    switch (programEnrollment.status) {
      case "pending":
        return "Applied";
      case "approved":
        return "Enrolled";
      default:
        return capitalize(programEnrollment.status);
    }
  }, [justApplied, programEnrollment]);

  const { programApplicationSheet, setIsOpen: setIsApplicationSheetOpen } =
    useProgramApplicationSheet({
      program,
      programEnrollment,
      onSuccess: () => setJustApplied(true),
    });

  if (programEnrollment?.status === "invited") {
    redirect(`/programs/${program.slug}/invite`);
  }

  return (
    <div>
      {programApplicationSheet}
      <div className="flex items-start justify-between gap-2">
        <BlurImage
          width={128}
          height={128}
          src={program.logo || `${OG_AVATAR_URL}${program.name}`}
          alt={program.name}
          className="size-16 rounded-full border border-black/10"
        />
        {statusBadge && (
          <StatusBadge icon={statusBadge.icon} variant={statusBadge.variant}>
            {statusBadge.label}
          </StatusBadge>
        )}
      </div>
      <div className="mt-4 flex flex-col">
        <span className="text-lg font-semibold text-neutral-800">
          {program.name}
        </span>
        {program.domain && (
          <div className="flex items-center gap-1 text-neutral-500">
            <Link4 className="size-3" />
            <span className="text-base font-medium">{program.domain}</span>
          </div>
        )}
      </div>

      <div className="mt-8">
        <LanderRewards
          rewards={
            (programEnrollment?.status === "approved"
              ? programEnrollment.rewards
              : null) ??
            applicationRewards ??
            program.rewards ??
            []
          }
          discount={
            programEnrollment?.discount ??
            applicationDiscount ??
            program.discounts?.[0] ??
            null
          }
          bounties={
            programEnrollment?.status === "approved" &&
            programEnrollment.groupId !== program.group?.id
              ? undefined
              : program.group?.bounties
          }
        />
      </div>

      {applicationRequirements && applicationRequirements.length ? (
        <ProgramEligibilityCard requirements={applicationRequirements} />
      ) : null}

      <Button
        className={cn("mt-4", justApplied && "text-green-600")}
        text={buttonText}
        icon={justApplied ? <CircleCheck className="size-4" /> : undefined}
        disabled={
          !!programEnrollment || justApplied || !!requirementsNotMet
            ? true
            : undefined
        }
        disabledTooltip={requirementsNotMet}
        onClick={() => setIsApplicationSheetOpen(true)}
      />
    </div>
  );
}
