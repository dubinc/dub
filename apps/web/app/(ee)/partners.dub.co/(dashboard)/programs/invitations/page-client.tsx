"use client";

import useProgramEnrollments from "@/lib/swr/use-program-enrollments";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { ProgramCardSkeleton } from "@/ui/partners/program-card";
import { ProgramInviteCard } from "@/ui/partners/program-invite-card";
import { SimpleEmptyState } from "@/ui/shared/simple-empty-state";
import { HexadecagonStar } from "@dub/ui/icons";

export function ProgramInvitationsPageClient() {
  const { programEnrollments, isLoading } = useProgramEnrollments({
    includeRewardsDiscounts: true,
    status: "invited",
  });

  return (
    <PageWidthWrapper className="pb-10">
      {programEnrollments?.length == 0 ? (
        <SimpleEmptyState
          title="No program invitations"
          description="When a program sends you an invitation to join them, they will appear here."
          graphic={
            <div className="border-border-subtle flex flex-col gap-4 rounded-xl border p-3 shadow-[0_4px_12px_#0001]">
              <HexadecagonStar className="text-content-default size-6" />
              <div className="flex flex-col gap-2">
                <div className="bg-bg-emphasis h-2.5 w-8 rounded" />
                <div className="bg-bg-emphasis h-2.5 w-16 rounded" />
              </div>
              <div className="bg-bg-inverted h-5 w-40 max-w-full rounded bg-neutral-800" />
            </div>
          }
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
