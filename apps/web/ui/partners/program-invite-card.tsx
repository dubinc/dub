import { ProgramEnrollmentProps } from "@/lib/types";
import { ProgramInviteActions } from "@/ui/partners/program-invite-actions";
import { ProgramRewardDescription } from "@/ui/partners/program-reward-description";
import { BlurImage, Envelope, StatusBadge } from "@dub/ui";
import { formatDateSmart, OG_AVATAR_URL } from "@dub/utils";

export function ProgramInviteCard({
  programEnrollment,
}: {
  programEnrollment: ProgramEnrollmentProps;
}) {
  const { program } = programEnrollment;

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

      <div className="my-2 flex flex-col gap-0.5 text-balance text-xs text-neutral-600">
        <div>
          <ProgramRewardDescription
            reward={reward}
            amountClassName="font-light"
            periodClassName="font-light"
          />
        </div>

        <div>
          <ProgramRewardDescription
            discount={discount}
            amountClassName="font-light"
            periodClassName="font-light"
          />
        </div>
      </div>

      <div className="mt-2 flex grow flex-col justify-end">
        <ProgramInviteActions programEnrollment={programEnrollment} />
      </div>
    </div>
  );
}
