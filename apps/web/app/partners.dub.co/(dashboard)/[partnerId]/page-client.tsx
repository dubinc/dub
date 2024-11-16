"use client";

import usePartnerProgramInvites from "@/lib/swr/use-partner-program-invites";
import useProgramEnrollments from "@/lib/swr/use-program-enrollments";
import { ProgramCard, ProgramCardSkeleton } from "@/ui/partners/program-card";
import { ProgramInviteCard } from "@/ui/partners/program-invite-card";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { MaxWidthWrapper } from "@dub/ui";
import { CircleDollar, GridIcon } from "@dub/ui/src/icons";

export function PartnersDashboardPageClient() {
  const { programEnrollments, isLoading } = useProgramEnrollments();
  const { programInvites } = usePartnerProgramInvites();

  return (
    <MaxWidthWrapper>
      {programEnrollments?.length == 0 && programInvites?.length == 0 ? (
        <AnimatedEmptyState
          title="No programs found"
          description="Enroll in programs to start earning."
          cardContent={
            <>
              <GridIcon className="size-4 text-neutral-700" />
              <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
              <div className="xs:flex hidden grow items-center justify-end gap-1.5 text-gray-500">
                <CircleDollar className="size-3.5" />
              </div>
            </>
          }
          learnMoreHref="https://dub.co/help/article/dub-conversions"
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <ProgramCardSkeleton key={idx} />
            ))
          ) : (
            <>
              {programInvites?.map((invite) => (
                <ProgramInviteCard key={invite.id} invite={invite} />
              ))}
              {programEnrollments?.map((programEnrollment, idx) => (
                <ProgramCard key={idx} programEnrollment={programEnrollment} />
              ))}
            </>
          )}
        </div>
      )}
    </MaxWidthWrapper>
  );
}
