import { acceptProgramInviteAction } from "@/lib/actions/partners/accept-program-invite";
import { ProgramInviteProps } from "@/lib/types";
import { ProgramCommissionDescription } from "@/ui/partners/program-commission-description";
import { BlurImage, Button } from "@dub/ui";
import { DICEBEAR_AVATAR_URL } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { useParams } from "next/navigation";
import { mutate } from "swr";

export function ProgramInviteCard({ invite }: { invite: ProgramInviteProps }) {
  const { partnerId } = useParams() as { partnerId: string };

  const { executeAsync, isExecuting } = useAction(acceptProgramInviteAction, {
    onSuccess: () => {
      mutate(
        (key) =>
          typeof key === "string" &&
          key.startsWith(`/api/partners/${partnerId}/programs`),
        undefined,
        { revalidate: true },
      );
    },
  });

  return (
    <div className="flex items-center justify-between rounded-md border border-neutral-300 bg-white p-4">
      <div className="flex items-center gap-4">
        <BlurImage
          width={96}
          height={96}
          src={
            invite.program.logo ||
            `${DICEBEAR_AVATAR_URL}${invite.program.name}`
          }
          alt={invite.program.name}
          className="size-6 rounded-full"
        />
        <div className="flex flex-col gap-0.5">
          <span className="text-base font-medium text-neutral-900">
            {invite.program.name}
          </span>
          <span className="text-sm text-neutral-600">
            <ProgramCommissionDescription program={invite.program} />
          </span>
        </div>
      </div>
      <Button
        text="Accept invite"
        className="h-9 w-fit"
        loading={isExecuting}
        onClick={() =>
          executeAsync({
            partnerId,
            programInviteId: invite.id,
          })
        }
      />
    </div>
  );
}
