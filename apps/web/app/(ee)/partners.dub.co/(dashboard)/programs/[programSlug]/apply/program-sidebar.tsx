"use client";

import { acceptProgramInviteAction } from "@/lib/actions/partners/accept-program-invite";
import { mutatePrefix } from "@/lib/swr/mutate";
import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import { DiscountProps, ProgramProps, RewardProps } from "@/lib/types";
import { PartnerStatusBadges } from "@/ui/partners/partner-status-badges";
import { useProgramApplicationSheet } from "@/ui/partners/program-application-sheet";
import { ProgramRewardList } from "@/ui/partners/program-reward-list";
import { BlurImage, Button, CircleCheck, Link4, StatusBadge } from "@dub/ui";
import { capitalize, cn, OG_AVATAR_URL } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export function ProgramSidebar({
  program,
  applicationRewards,
  applicationDiscount,
}: {
  program: ProgramProps;
  applicationRewards: RewardProps[];
  applicationDiscount: DiscountProps | null;
}) {
  const router = useRouter();

  const { programEnrollment, loading: isLoadingProgramEnrollment } =
    useProgramEnrollment({
      swrOpts: {
        keepPreviousData: true,
        shouldRetryOnError: (err) => err.status !== 404,
        revalidateOnFocus: false,
      },
    });

  const statusBadge = programEnrollment
    ? {
        ...PartnerStatusBadges,
        pending: {
          ...PartnerStatusBadges.pending,
          label: "Applied",
        },
      }[programEnrollment.status]
    : null;

  const [justApplied, setJustApplied] = useState(false);

  const buttonText = useMemo(() => {
    if (justApplied) return "Applied";

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
  }, [justApplied, programEnrollment]);

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

  const { programApplicationSheet, setIsOpen: setIsApplicationSheetOpen } =
    useProgramApplicationSheet({
      program,
      onSuccess: () => setJustApplied(true),
    });

  return (
    <div>
      {programApplicationSheet}
      <div className="flex items-start justify-between gap-2">
        <BlurImage
          width={128}
          height={128}
          src={program.logo || `${OG_AVATAR_URL}${program.name}`}
          alt={program.name}
          className="size-16 rounded-full border border-black/10"
        />
        {statusBadge && (
          <StatusBadge icon={statusBadge.icon} variant={statusBadge.variant}>
            {statusBadge.label}
          </StatusBadge>
        )}
      </div>
      <div className="mt-4 flex flex-col">
        <span className="text-lg font-semibold text-neutral-800">
          {program.name}
        </span>
        {program.domain && (
          <div className="flex items-center gap-1 text-neutral-500">
            <Link4 className="size-3" />
            <span className="text-base font-medium">{program.domain}</span>
          </div>
        )}
      </div>

      <div className="mt-8">
        <h2 className="mb-2 text-base font-semibold text-neutral-800">
          Rewards
        </h2>
        {isLoadingProgramEnrollment ? (
          <div className="h-24 w-full animate-pulse rounded-md bg-neutral-100" />
        ) : (
          <ProgramRewardList
            rewards={
              (programEnrollment?.status === "approved"
                ? programEnrollment.rewards
                : null) ??
              applicationRewards ??
              program.rewards ??
              []
            }
            discount={
              programEnrollment?.discount ?? applicationDiscount !== undefined
                ? applicationDiscount
                : program.discounts?.[0] ?? null
            }
            className="bg-neutral-100"
          />
        )}
      </div>

      {!isLoadingProgramEnrollment && (
        <Button
          className={cn("mt-8", justApplied && "text-green-600")}
          text={buttonText}
          icon={justApplied ? <CircleCheck className="size-4" /> : undefined}
          disabled={
            (programEnrollment && programEnrollment.status !== "invited") ||
            justApplied
          }
          onClick={() => {
            if (programEnrollment?.status === "invited") {
              executeAcceptInvite({
                partnerId: programEnrollment.partnerId,
                programId: programEnrollment.programId,
              });
            } else setIsApplicationSheetOpen(true);
          }}
          loading={isAcceptingInvite}
        />
      )}
    </div>
  );
}
