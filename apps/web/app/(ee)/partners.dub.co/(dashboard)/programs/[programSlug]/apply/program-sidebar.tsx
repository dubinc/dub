"use client";

import { submitNetworkProfileAction } from "@/lib/actions/partners/submit-network-profile";
import { getNetworkProfileChecklistProgress } from "@/lib/network/get-network-profile-checklist-progress";
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
import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { LanderRewards } from "@/ui/partners/lander/lander-rewards";
import { NetworkStatusBadges } from "@/ui/partners/partner-network/network-status-badges";
import { PartnerStatusBadges } from "@/ui/partners/partner-status-badges";
import { useProgramApplicationSheet } from "@/ui/partners/program-application-sheet";
import { ProgramEligibilityCard } from "@/ui/partners/program-eligibility-card";
import {
  BlurImage,
  Button,
  CircleCheck,
  Link4,
  ProgressCircle,
  StatusBadge,
} from "@dub/ui";
import { capitalize, cn, OG_AVATAR_URL } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ReactNode, useMemo, useState } from "react";
import { toast } from "sonner";

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
  const { partner, mutate } = usePartnerProfile();

  const { completedCount, totalCount, isComplete } =
    getNetworkProfileChecklistProgress({
      partner,
    });

  const { executeAsync: submitNetworkProfile } = useAction(
    submitNetworkProfileAction,
    {
      onSuccess: () => {
        toast.success("Application submitted successfully");
      },
      onError: ({ error }) => {
        toast.error(error.serverError);
      },
    },
  );

  const { setShowConfirmModal, confirmModal } = useConfirmModal({
    title: "Submit application",
    description:
      "Are you sure you want to submit your Dub Network application for review? You won't be able to make changes to your application after submitting it.",
    confirmText: "Confirm submission",
    onConfirm: async () => {
      await submitNetworkProfile();
      await mutate();
    },
  });
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
    },
  });

  const requirementsNotMet =
    reason === "requirementsNotMet"
      ? "You do not meet the eligibility requirements for this program"
      : undefined;

  const [justApplied, setJustApplied] = useState(false);

  const applyDisabledTooltip: ReactNode = justApplied
    ? undefined
    : programEnrollment?.status === "pending"
      ? "Your application is under review"
      : programEnrollment?.status &&
          ["banned", "rejected", "deactivated"].includes(
            programEnrollment.status,
          )
        ? `You were ${programEnrollment.status} from this program`
        : programEnrollment
          ? undefined
          : !isComplete
            ? (
                <div className="max-w-xs p-3 text-center">
                  <div className="text-content-default text-pretty text-sm leading-5">
                    Complete your profile to join the Dub Partner Network. Once
                    approved, you can then apply to this program.
                  </div>
                  <Link
                    href="/profile"
                    className="bg-bg-subtle mt-3 flex items-center justify-center gap-2 rounded-lg px-2.5 py-1.5"
                  >
                    <ProgressCircle
                      progress={completedCount / totalCount}
                      className="text-green-500"
                    />
                    <span className="text-content-default text-sm font-medium">
                      {completedCount} of {totalCount} tasks completed
                    </span>
                  </Link>
                </div>
              )
            : partner && !["approved", "trusted"].includes(partner.networkStatus)
              ? (() => {
                  const networkStatusBadge =
                    NetworkStatusBadges[partner.networkStatus];
                  if (!("partnerTooltip" in networkStatusBadge)) {
                    return null;
                  }
                  const {
                    partnerTooltip,
                    icon: Icon,
                    className,
                  } = networkStatusBadge;
                  const { content, cta } = partnerTooltip;

                  return (
                    <div className="max-w-xs space-y-2 p-4 text-center">
                      <div className="text-content-default text-pretty text-sm leading-5">
                        {content}
                      </div>
                      {partner.networkStatus === "draft" ? (
                        <Button
                          className="p-2"
                          text={cta}
                          onClick={() => setShowConfirmModal(true)}
                        />
                      ) : (
                        <Link
                          href="/profile"
                          className={cn(
                            "flex items-center justify-center gap-2 rounded-lg p-2",
                            "ctaClassName" in partnerTooltip
                              ? partnerTooltip.ctaClassName
                              : className,
                          )}
                        >
                          <Icon className="size-4 shrink-0" />
                          <span className="text-sm font-medium">{cta}</span>
                        </Link>
                      )}
                    </div>
                  );
                })()
              : requirementsNotMet;

  const statusBadge = programEnrollment
    ? {
        ...PartnerStatusBadges,
        pending: {
          ...PartnerStatusBadges.pending,
          label: "Applied",
        },
      }[programEnrollment.status]
    : null;

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
      {confirmModal}
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
          !applyDisabledTooltip &&
          (!!programEnrollment || justApplied)
            ? true
            : undefined
        }
        disabledTooltip={applyDisabledTooltip}
        onClick={() => setIsApplicationSheetOpen(true)}
      />
    </div>
  );
}
