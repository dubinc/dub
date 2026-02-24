"use client";

import { acceptProgramInviteAction } from "@/lib/actions/partners/accept-program-invite";
import { getPartnerProfileChecklistProgress } from "@/lib/network/get-partner-profile-checklist-progress";
import { mutatePrefix } from "@/lib/swr/mutate";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import useProgramEnrollments from "@/lib/swr/use-program-enrollments";
import { NetworkProgramProps } from "@/lib/types";
import { useProgramApplicationSheet } from "@/ui/partners/program-application-sheet";
import { Button, ProgressCircle, useKeyboardShortcut } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ReactNode, useMemo } from "react";
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

  const { partner } = usePartnerProfile();

  const { programEnrollment } = useProgramEnrollment();

  const checklistProgress = useMemo(() => {
    return partner
      ? getPartnerProfileChecklistProgress({
          partner,
        })
      : undefined;
  }, [partner]);

  const disabledTooltip: ReactNode =
    programEnrollment?.status === "pending" ? (
      "Your application is under review"
    ) : programEnrollment?.status &&
      ["banned", "rejected", "deactivated"].includes(
        programEnrollment.status,
      ) ? (
      `You were ${programEnrollment.status} from this program`
    ) : checklistProgress && !checklistProgress.isComplete ? (
      <div className="max-w-xs p-4">
        <div className="text-content-default text-sm leading-5">
          Complete your partner profile to apply
        </div>
        <Link
          href="/profile"
          className="bg-bg-subtle mt-3 flex items-center justify-center gap-2 rounded-lg px-2.5 py-1.5"
        >
          <ProgressCircle
            progress={
              checklistProgress.completedCount / checklistProgress.totalCount
            }
            className="text-green-500"
          />
          <span className="text-content-default text-sm font-medium">
            {checklistProgress.completedCount} of {checklistProgress.totalCount}{" "}
            tasks completed
          </span>
        </Link>
      </div>
    ) : undefined;

  useKeyboardShortcut("a", () => setIsApplicationSheetOpen(true), {
    enabled: !disabledTooltip,
  });

  return (
    <>
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
