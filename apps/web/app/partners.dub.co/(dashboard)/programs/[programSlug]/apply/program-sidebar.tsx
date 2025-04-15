"use client";

import { acceptProgramInviteAction } from "@/lib/actions/partners/accept-program-invite";
import { mutatePrefix } from "@/lib/swr/mutate";
import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import { PartnerStatusBadges } from "@/ui/partners/partner-status-badges";
import { ProgramRewardList } from "@/ui/partners/program-reward-list";
import { BlurImage, Button, Link4, StatusBadge } from "@dub/ui";
import { capitalize, OG_AVATAR_URL } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { toast } from "sonner";

export function ProgramSidebar() {
  const router = useRouter();

  const { programEnrollment, loading: isLoadingProgramEnrollment } =
    useProgramEnrollment();

  const program = programEnrollment?.program;

  const statusBadge = programEnrollment
    ? {
        ...PartnerStatusBadges,
        pending: {
          ...PartnerStatusBadges.pending,
          label: "Applied",
        },
      }[programEnrollment.status]
    : null;

  const buttonText = useMemo(() => {
    if (!programEnrollment) return "Apply";

    switch (programEnrollment.status) {
      case "pending":
        return "Applied";
      case "invited":
        return "Accept invite";
      case "approved":
        return "Enrolled";
      default:
        return capitalize(programEnrollment.status);
    }
  }, [programEnrollment]);

  const { executeAsync: executeAcceptInvite, isPending: isAcceptingInvite } =
    useAction(acceptProgramInviteAction, {
      onSuccess: async () => {
        await mutatePrefix("/api/partner-profile/programs");
        toast.success("Program invite accepted!");
        if (program) {
          router.push(`/programs/${program.slug}`);
        }
      },
      onError: ({ error }) => {
        toast.error(error.serverError);
      },
    });

  return (
    <div>
      <div className="flex items-start justify-between gap-2">
        {program ? (
          <BlurImage
            width={128}
            height={128}
            src={program.logo || `${OG_AVATAR_URL}${program.name}`}
            alt={program.name}
            className="size-16 rounded-full border border-black/10"
          />
        ) : (
          <div className="size-16 animate-pulse rounded-full bg-neutral-200" />
        )}
        {statusBadge && (
          <StatusBadge icon={statusBadge.icon} variant={statusBadge.variant}>
            {statusBadge.label}
          </StatusBadge>
        )}
      </div>
      <div className="mt-4 flex flex-col">
        {program ? (
          <>
            <span className="text-lg font-semibold text-neutral-800">
              {program.name}
            </span>
            {program.domain && (
              <div className="flex items-center gap-1 text-neutral-500">
                <Link4 className="size-3" />
                <span className="text-base font-medium">{program.domain}</span>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="my-0.5 h-6 w-24 animate-pulse rounded-md bg-neutral-100" />
            <div className="my-0.5 h-5 w-32 animate-pulse rounded-md bg-neutral-100" />
          </>
        )}
      </div>

      <div className="mt-8">
        <h2 className="mb-2 text-base font-semibold text-neutral-800">
          Rewards
        </h2>
        {programEnrollment ? (
          <ProgramRewardList
            rewards={programEnrollment.rewards ?? []}
            discount={programEnrollment.discount}
            className="bg-neutral-100"
          />
        ) : (
          <div className="h-24 w-full animate-pulse rounded-md bg-neutral-100" />
        )}
      </div>

      {!isLoadingProgramEnrollment && (
        <Button
          className="mt-8"
          text={buttonText}
          disabled={programEnrollment && programEnrollment.status !== "invited"}
          onClick={() => {
            if (programEnrollment?.status === "invited") {
              executeAcceptInvite({
                partnerId: programEnrollment.partnerId,
                programId: programEnrollment.programId,
              });
            }
          }}
          loading={isAcceptingInvite}
        />
      )}
    </div>
  );
}
