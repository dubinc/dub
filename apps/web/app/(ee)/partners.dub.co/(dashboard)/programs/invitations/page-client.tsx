"use client";

import useProgramEnrollments from "@/lib/swr/use-program-enrollments";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { ProgramCardSkeleton } from "@/ui/partners/program-card";
import { ProgramInviteCard } from "@/ui/partners/program-invite-card";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { CircleDollar, GridIcon } from "@dub/ui/icons";

export function ProgramInvitationsPageClient() {
  const { programEnrollments, isLoading } = useProgramEnrollments({
    includeRewardsDiscounts: true,
    status: "invited",
  });

  return (
    <PageWidthWrapper className="pb-10">
      {programEnrollments?.length == 0 ? (
        <AnimatedEmptyState
          title="No programs found"
          description="Enroll in programs to start earning."
          cardContent={
            <>
              <GridIcon className="size-4 text-neutral-700" />
              <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
              <div className="xs:flex hidden grow items-center justify-end gap-1.5 text-neutral-500">
                <CircleDollar className="size-3.5" />
              </div>
            </>
          }
          learnMoreHref="https://d.to/conversions"
        />
      ) : (
        <div className="@md/page:grid-cols-2 @3xl/page:grid-cols-3 grid gap-4">
          {isLoading
            ? Array.from({ length: 3 }).map((_, idx) => (
                <ProgramCardSkeleton key={idx} />
              ))
            : programEnrollments?.map((programEnrollment, idx) => (
                <ProgramInviteCard
                  key={idx}
                  programEnrollment={programEnrollment}
                />
              ))}
        </div>
      )}
    </PageWidthWrapper>
  );
}
