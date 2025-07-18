import { acceptProgramInviteAction } from "@/lib/actions/partners/accept-program-invite";
import { mutatePrefix } from "@/lib/swr/mutate";
import { ProgramEnrollmentProps } from "@/lib/types";
import { ProgramRewardDescription } from "@/ui/partners/program-reward-description";
import {
  BlurImage,
  Button,
  buttonVariants,
  Envelope,
  StatusBadge,
} from "@dub/ui";
import { formatDateSmart, OG_AVATAR_URL } from "@dub/utils";
import { cn } from "@dub/utils/src";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
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

  const reward = programEnrollment.rewards?.[0];
  const discount = programEnrollment.discount;

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
          Invited {formatDateSmart(programEnrollment.createdAt)}
        </StatusBadge>
      </div>

      <p className="mt-3 font-medium text-neutral-900">{program.name}</p>

      <p className="my-2 text-balance text-xs text-neutral-600">
        <ProgramRewardDescription
          reward={reward}
          discount={discount}
          amountClassName="font-light"
          periodClassName="font-light"
        />
      </p>

      <div className="mt-2 flex grow flex-col justify-end">
        <div className="grid grid-cols-2 gap-2">
          <Link
            className={cn(
              "flex h-8 items-center justify-center whitespace-nowrap rounded-md border px-2 text-sm",
              buttonVariants({ variant: "secondary" }),
            )}
            href={`/programs/${program.slug}/apply`}
          >
            Learn more
          </Link>
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
    </div>
  );
}
