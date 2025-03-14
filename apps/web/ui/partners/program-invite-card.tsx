import { acceptProgramInviteAction } from "@/lib/actions/partners/accept-program-invite";
import { mutatePrefix } from "@/lib/swr/mutate";
import { ProgramEnrollmentProps } from "@/lib/types";
import { ProgramRewardDescription } from "@/ui/partners/program-reward-description";
import { BlurImage, Button, StatusBadge } from "@dub/ui";
import { DICEBEAR_AVATAR_URL } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";

export function ProgramInviteCard({
  programEnrollment,
}: {
  programEnrollment: ProgramEnrollmentProps;
}) {
  const { program } = programEnrollment;

  const { executeAsync, isPending } = useAction(acceptProgramInviteAction, {
    onSuccess: async () => {
      await mutatePrefix("/api/partner-profile/programs");
      toast.success("Program invite accepted!");
    },
    onError: ({ error }) => {
      toast.error(error.serverError);
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
          src={program.logo || `${DICEBEAR_AVATAR_URL}${program.name}`}
          alt={program.name}
          className="size-6 rounded-full"
        />
      </div>
      <div className="grid max-w-xs gap-1 pb-1 text-center">
        <p className="font-medium text-neutral-900">{program.name}</p>
        <p className="text-balance text-xs text-neutral-600">
          <ProgramRewardDescription
            reward={program.rewards?.[0]}
            discount={program.discounts?.[0]}
            amountClassName="font-light"
            periodClassName="font-light"
          />
        </p>
      </div>
      <Button
        text="Accept invite"
        className="h-8"
        loading={isPending}
        onClick={async () =>
          await executeAsync({
            partnerId: programEnrollment.partnerId,
            programId: programEnrollment.programId,
          })
        }
      />
    </div>
  );
}
