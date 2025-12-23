"use client";

import { acceptProgramInviteAction } from "@/lib/actions/partners/accept-program-invite";
import { mutatePrefix } from "@/lib/swr/mutate";
import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import useProgramEnrollments from "@/lib/swr/use-program-enrollments";
import { NetworkProgramProps } from "@/lib/types";
import { useProgramApplicationSheet } from "@/ui/partners/program-application-sheet";
import { Button, useKeyboardShortcut } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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

  const { programEnrollment } = useProgramEnrollment();

  const disabledTooltip =
    programEnrollment?.status === "banned"
      ? "You are banned from this program"
      : programEnrollment?.status === "pending"
        ? "Your application is under review"
        : programEnrollment?.status === "rejected"
          ? "Your application was rejected"
          : undefined;

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
