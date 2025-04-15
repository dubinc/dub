import { acceptProgramInviteAction } from "@/lib/actions/partners/accept-program-invite";
import { mutatePrefix } from "@/lib/swr/mutate";
import { ProgramEnrollmentProps } from "@/lib/types";
import { ProgramRewardDescription } from "@/ui/partners/program-reward-description";
import { BlurImage, Button, Envelope, Link4, StatusBadge } from "@dub/ui";
import { OG_AVATAR_URL } from "@dub/utils";
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
    <div className="hover:drop-shadow-card-hover relative flex flex-col rounded-xl border border-neutral-200 bg-neutral-50 p-5 transition-[filter]">
      <div className="flex justify-between gap-2">
        <BlurImage
          width={64}
          height={64}
          src={program.logo || `${OG_AVATAR_URL}${program.name}`}
          alt={program.name}
          className="size-8 rounded-full"
        />
        <StatusBadge variant="new" icon={Envelope} className="py-0.5">
          Invited
        </StatusBadge>
      </div>

      <p className="mt-3 font-medium text-neutral-900">{program.name}</p>
      {program.domain && (
        <p className="flex items-center gap-1 text-neutral-500">
          <Link4 className="size-3" />
          <span className="text-sm font-medium">{program.domain}</span>
        </p>
      )}
      <p className="mt-2 text-balance text-xs text-neutral-600">
        <ProgramRewardDescription
          reward={program.rewards?.[0]}
          discount={program.discounts?.[0]}
          amountClassName="font-light"
          periodClassName="font-light"
        />
      </p>

      <div className="mt-2 flex grow flex-col justify-end">
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
    </div>
  );
}
