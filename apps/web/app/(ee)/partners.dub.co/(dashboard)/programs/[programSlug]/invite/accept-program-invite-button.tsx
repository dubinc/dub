"use client";

import { acceptProgramInviteAction } from "@/lib/actions/partners/accept-program-invite";
import { mutatePrefix } from "@/lib/swr/mutate";
import { ProgramProps } from "@/lib/types";
import { Button, useKeyboardShortcut } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function AcceptProgramInviteButton({
  program,
}: {
  program: Pick<ProgramProps, "id" | "slug">;
}) {
  const router = useRouter();

  const { executeAsync: executeAcceptInvite, isPending: isAcceptingInvite } =
    useAction(acceptProgramInviteAction, {
      onSuccess: async () => {
        await mutatePrefix("/api/partner-profile/programs");
        toast.success("Program invite accepted!");
        router.push(`/programs/${program.slug}`);
      },
      onError: ({ error }) => {
        toast.error(error.serverError);
      },
    });

  const acceptInvite = () => {
    executeAcceptInvite({ programId: program.id });
  };

  useKeyboardShortcut("a", acceptInvite, {
    enabled: !isAcceptingInvite,
  });

  return (
    <Button
      onClick={acceptInvite}
      loading={isAcceptingInvite}
      text="Accept invite"
      shortcut="A"
      className="h-9 rounded-lg [&>div]:flex-initial"
    />
  );
}
