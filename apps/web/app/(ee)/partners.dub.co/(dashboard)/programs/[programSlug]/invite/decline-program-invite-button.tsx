"use client";

import { declineProgramInviteAction } from "@/lib/actions/partners/decline-program-invite";
import { mutatePrefix } from "@/lib/swr/mutate";
import { ProgramProps } from "@/lib/types";
import { Button } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function DeclineProgramInviteButton({
  program,
}: {
  program: Pick<ProgramProps, "id">;
}) {
  const router = useRouter();

  const { executeAsync: executeDeclineInvite, isPending: isDecliningInvite } =
    useAction(declineProgramInviteAction, {
      onSuccess: async () => {
        await mutatePrefix("/api/partner-profile/programs");
        toast.success("Program invite declined.");
        router.push("/programs");
      },
      onError: ({ error }) => {
        toast.error(error.serverError);
      },
    });

  return (
    <Button
      variant="secondary"
      onClick={() => executeDeclineInvite({ programId: program.id })}
      loading={isDecliningInvite}
      text="Decline"
      className="h-9 rounded-lg"
    />
  );
}
