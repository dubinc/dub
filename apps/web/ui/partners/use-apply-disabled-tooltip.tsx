"use client";

import { submitNetworkProfileAction } from "@/lib/actions/partners/submit-network-profile";
import { getNetworkProfileChecklistProgress } from "@/lib/network/get-network-profile-checklist-progress";
import { evaluateApplicationRequirements } from "@/lib/partners/evaluate-application-requirements";
import { getReapplyStatus } from "@/lib/program-applications/reapplication";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { PartnerProfileProgramEnrollmentProps } from "@/lib/types";
import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { NetworkStatusBadges } from "@/ui/partners/partner-network/network-status-badges";
import { Button, ProgressCircle } from "@dub/ui";
import { cn } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { ReactNode } from "react";
import { toast } from "sonner";

/**
 * Why the partner cannot apply to a program from the partner portal, or
 * undefined if they can. Used by the apply page and the marketplace.
 */
export function useApplyDisabledTooltip({
  applicationRequirements,
  programEnrollment,
}: {
  applicationRequirements: unknown;
  programEnrollment?: Pick<
    PartnerProfileProgramEnrollmentProps,
    "status" | "reapplicationTimeframe" | "application"
  >;
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

  const { canReapply, blockedReason: reapplyBlockedReason } = programEnrollment
    ? getReapplyStatus(programEnrollment)
    : { canReapply: false, blockedReason: null };

  const disabledTooltip: ReactNode =
    programEnrollment?.status === "pending" ? (
      "Your application is under review"
    ) : reapplyBlockedReason ? (
      reapplyBlockedReason
    ) : programEnrollment?.status &&
      ["banned", "deactivated"].includes(programEnrollment.status) ? (
      `You were ${programEnrollment.status} from this program`
    ) : programEnrollment && !canReapply ? undefined : !isComplete ? (
      <div className="max-w-xs p-3 text-center">
        <div className="text-content-default text-pretty text-sm leading-5">
          Complete your profile to join the Dub Partner Network. Once approved,
          you can then apply to this program.
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
    ) : partner && !["approved", "trusted"].includes(partner.networkStatus) ? (
      (() => {
        const networkStatusBadge = NetworkStatusBadges[partner.networkStatus];
        if (!("partnerTooltip" in networkStatusBadge)) {
          return null;
        }
        const { partnerTooltip, icon: Icon, className } = networkStatusBadge;
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
    ) : (
      requirementsNotMet
    );

  return { disabledTooltip, canReapply, confirmModal };
}
