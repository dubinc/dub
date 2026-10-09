import { ProgramEnrollmentProps } from "@/lib/types";
import { ProgramInviteActions } from "@/ui/partners/program-invite-actions";
import { ProgramRewardDescription } from "@/ui/partners/program-reward-description";
import { BlurImage, CircleCheck, StatusBadge } from "@dub/ui";
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
    <div className="hover:drop-shadow-card-hover relative flex flex-col rounded-xl border border-neutral-200 bg-white p-5 transition-[filter]">
      <div className="flex justify-between gap-2">
        <BlurImage
          width={64}
          height={64}
          src={program.logo || `${OG_AVATAR_URL}${program.name}`}
          alt={program.name}
          className="size-8 rounded-full border border-black/10"
        />
        <StatusBadge variant="new" icon={CircleCheck} className="py-0.5">
          Invited{" "}
          {formatDateSmart(programEnrollment.createdAt, { month: "short" })}
        </StatusBadge>
      </div>

      <p className="mt-3 text-base font-semibold text-neutral-800">
        {program.name}
      </p>

      <div className="flex flex-col gap-0.5 text-balance text-sm text-neutral-500">
        <div>
          <ProgramRewardDescription
            reward={reward}
            amountClassName="font-normal"
            periodClassName="font-normal"
          />
        </div>

        <div>
          <ProgramRewardDescription
            discount={discount}
            amountClassName="font-normal"
            periodClassName="font-normal"
          />
        </div>
      </div>

      <div className="mt-4 flex grow flex-col justify-end">
        <ProgramInviteActions programEnrollment={programEnrollment} />
      </div>
    </div>
  );
}
