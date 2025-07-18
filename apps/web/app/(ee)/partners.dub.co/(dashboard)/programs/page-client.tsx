"use client";

import useProgramEnrollments from "@/lib/swr/use-program-enrollments";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { ProgramCard, ProgramCardSkeleton } from "@/ui/partners/program-card";
import { SimpleEmptyState } from "@/ui/shared/simple-empty-state";
import { HexadecagonStar } from "@dub/ui/icons";
import { useId } from "react";

export function PartnersDashboardPageClient() {
  const { programEnrollments: allProgramEnrollments, isLoading } =
    useProgramEnrollments({
      includeRewardsDiscounts: true,
    });

  const programEnrollments = allProgramEnrollments?.filter(
    (programEnrollment) => programEnrollment.status !== "invited",
  );

  return (
    <PageWidthWrapper className="pb-10">
      {programEnrollments?.length == 0 ? (
        <SimpleEmptyState
          title="No programs"
          description="When you've joined or applied for a program it will appear here."
          graphic={
            <div className="border-border-subtle flex flex-col gap-4 rounded-xl border p-3 shadow-[0_4px_12px_#0001]">
              <HexadecagonStar className="text-content-default size-6" />
              <div className="flex flex-col gap-2">
                <div className="bg-bg-emphasis h-2.5 w-8 rounded" />
                <div className="bg-bg-emphasis h-2.5 w-16 rounded" />
              </div>
              <div className="bg-bg-subtle border-subtle grid w-40 max-w-full grid-cols-2 items-center gap-5 rounded-lg border p-2">
                <div className="flex flex-col gap-2">
                  <div className="bg-bg-emphasis h-2.5 w-9 rounded" />
                  <div className="bg-bg-inverted h-2.5 w-12 rounded" />
                </div>
                <EmptyStateChart />
              </div>
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
                <ProgramCard key={idx} programEnrollment={programEnrollment} />
              ))}
        </div>
      )}
    </PageWidthWrapper>
  );
}

function EmptyStateChart() {
  const id = useId();

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 61 28"
      className="h-auto w-full"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#262626" />
          <stop stopColor="#262626" stopOpacity="0" offset="1" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${id})`}
        d="m51.893 5.274-4.954 6.63a4 4 0 0 1-4.88 1.238l-3.053-1.408a4 4 0 0 0-3.062-.121l-5.094 1.88a4 4 0 0 1-1.753.231l-5.836-.538a4 4 0 0 1-1.443-.417l-4.338-2.202a4 4 0 0 0-4.524.627l-4.873 4.499a4 4 0 0 1-1.327.813L0 19v9h60V1l-6.579 3.036a4 4 0 0 0-1.528 1.238"
        opacity="0.25"
      />
      <path
        stroke="#262626"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="m.5 19.274 6.668-3.125a6 6 0 0 0 1.375-.892l3.738-3.228a6 6 0 0 1 6.646-.805l2.76 1.406a6 6 0 0 0 2.253.636l5.066.399a6 6 0 0 0 2.271-.258l4.283-1.348a6 6 0 0 1 3.997.14l1.252.492a6 6 0 0 0 6.944-1.916l3.779-4.891a6 6 0 0 1 2.195-1.762l6.106-2.872"
      />
    </svg>
  );
}
