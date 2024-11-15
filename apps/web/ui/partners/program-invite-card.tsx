import { acceptProgramInviteAction } from "@/lib/actions/partners/accept-program-invite";
import { ProgramInviteProps } from "@/lib/types";
import { ProgramCommissionDescription } from "@/ui/partners/program-commission-description";
import { BlurImage, Button, StatusBadge } from "@dub/ui";
import { DICEBEAR_AVATAR_URL } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { mutate } from "swr";

export function ProgramInviteCard({ invite }: { invite: ProgramInviteProps }) {
  const { partnerId } = useParams() as { partnerId: string };

  const { executeAsync, isExecuting } = useAction(acceptProgramInviteAction, {
    onSuccess: () => {
      toast.success("Program invite accepted!");
      mutate(
        (key) =>
          typeof key === "string" &&
          key.startsWith(`/api/partners/${partnerId}/programs`),
        undefined,
        { revalidate: true },
      );
    },
    onError: ({ error }) => {
      toast.error(error.serverError?.serverError);
    },
  });

  return (
    <div className="hover:drop-shadow-card-hover relative flex flex-col items-center justify-center gap-2 rounded-md border border-neutral-300 bg-neutral-50 p-4 transition-[filter]">
      <StatusBadge
        variant="new"
        icon={null}
        className="absolute left-4 top-4 rounded-full py-0.5"
      >
        Invited
      </StatusBadge>
      <div className="flex size-10 items-center justify-center rounded-full border border-neutral-200 bg-white">
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
      </div>
      <div className="grid max-w-xs gap-1 pb-1 text-center">
        <p className="font-medium text-neutral-900">{invite.program.name}</p>
        <p className="text-balance text-xs text-neutral-600">
          <ProgramCommissionDescription
            program={invite.program}
            amountClassName="font-light"
            periodClassName="font-light"
          />
        </p>
      </div>
      <Button
        text="Accept invite"
        className="h-8"
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
