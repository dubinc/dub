"use client";

import { acceptProgramInviteAction } from "@/lib/actions/partners/accept-program-invite";
import { submitNetworkProfileAction } from "@/lib/actions/partners/submit-network-profile";
import { getNetworkProfileChecklistProgress } from "@/lib/network/get-network-profile-checklist-progress";
import { evaluateApplicationRequirements } from "@/lib/partners/evaluate-application-requirements";
import { mutatePrefix } from "@/lib/swr/mutate";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import useProgramEnrollments from "@/lib/swr/use-program-enrollments";
import { NetworkProgramProps } from "@/lib/types";
import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { NetworkStatusBadges } from "@/ui/partners/partner-network/network-status-badges";
import { useProgramApplicationSheet } from "@/ui/partners/program-application-sheet";
import { Button, ProgressCircle, useKeyboardShortcut } from "@dub/ui";
import { cn } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ReactNode } from "react";
import { toast } from "sonner";

export function MarketplaceProgramHeaderControls({
  program,
}: {
  program: NetworkProgramProps;
}) {
  const { programSlug } = useParams();
  const { programEnrollments } = useProgramEnrollments();

  const programEnrollmentStatus = programEnrollments?.find(
    (programEnrollment) => programEnrollment.program.slug === programSlug,
  )?.status;

  if (programEnrollmentStatus === "invited") {
    return <AcceptInviteButton key={program.id} program={program} />;
  }

  if (programEnrollmentStatus === "approved") {
    return (
      <Link href={`/programs/${program.slug}`}>
        <Button text="View dashboard" className="h-9 rounded-lg px-3" />
      </Link>
    );
  }

  return <ApplyButton program={program} />;
}

function ApplyButton({ program }: { program: NetworkProgramProps }) {
  const { programApplicationSheet, setIsOpen: setIsApplicationSheetOpen } =
    useProgramApplicationSheet({
      program,
      backDestination: "marketplace",
      onSuccess: () => mutatePrefix("/api/network/programs"),
    });

  const { partner, mutate } = usePartnerProfile();

  const { programEnrollment } = useProgramEnrollment();

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
    applicationRequirements: program.applicationRequirements,
    context: {
      country: partner?.country,
      email: partner?.email,
    },
  });

  const requirementsNotMet =
    reason === "requirementsNotMet"
      ? "You do not meet the eligibility requirements for this program"
      : undefined;

  const disabledTooltip: ReactNode =
    programEnrollment?.status === "pending" ? (
      "Your application is under review"
    ) : programEnrollment?.status &&
      ["banned", "rejected", "deactivated"].includes(
        programEnrollment.status,
      ) ? (
      `You were ${programEnrollment.status} from this program`
    ) : !isComplete ? (
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

  useKeyboardShortcut("a", () => setIsApplicationSheetOpen(true), {
    enabled: !disabledTooltip,
  });

  return (
    <>
      {confirmModal}
      {programApplicationSheet}
      <Button
        text="Apply"
        shortcut="A"
        onClick={() => setIsApplicationSheetOpen(true)}
        disabledTooltip={disabledTooltip}
        className="h-9 rounded-lg"
      />
    </>
  );
}

function AcceptInviteButton({ program }: { program: NetworkProgramProps }) {
  const router = useRouter();

  const { executeAsync, isPending } = useAction(acceptProgramInviteAction, {
    onSuccess: async () => {
      await mutatePrefix("/api/partner-profile/programs");
      toast.success("Program invite accepted!");
      router.push(`/programs/${program.slug}`);
    },
    onError: ({ error }) => {
      toast.error(error.serverError);
    },
  });

  const onAccept = () => executeAsync({ programId: program.id });

  useKeyboardShortcut("a", onAccept, {
    enabled: !isPending,
  });

  return (
    <Button
      text="Accept invite"
      shortcut="A"
      onClick={onAccept}
      loading={isPending}
      className="h-9 rounded-lg"
    />
  );
}
