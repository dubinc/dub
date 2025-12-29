"use client";

import { useCrossProgramSummary } from "@/lib/swr/use-cross-program-summary";
import { UserCheck, UserXmark } from "@dub/ui";

export function ProgramOwnerActivity({ partnerId }: { partnerId: string }) {
  const { crossProgramSummary, isLoading } = useCrossProgramSummary({
    partnerId,
  });

  const crossProgramMetrics = [
    {
      icon: UserXmark,
      text: "Banned from programs",
      total: crossProgramSummary?.totalPrograms,
      value: crossProgramSummary?.bannedPrograms,
    },
    {
      icon: UserCheck,
      text: "Marked as trustworthy",
      total: crossProgramSummary?.totalPrograms,
      value: crossProgramSummary?.trustedPrograms,
    },
  ];

  return (
    <div className="bg-bg-muted border-border-subtle flex flex-col gap-3 rounded-xl border px-4 py-3 sm:shrink-0">
      <h2 className="text-content-default text-sm font-semibold leading-5">
        Program owner activity
      </h2>
      <div className="flex flex-col gap-2">
        {crossProgramMetrics.map((item) => (
          <div
            key={item.text}
            className="flex items-center justify-between gap-2"
          >
            <div className="flex flex-grow items-center gap-2 sm:w-64">
              <item.icon className="size-4 shrink-0" />
              <span className="text-xs font-medium text-neutral-700">
                {item.text}
              </span>
            </div>

            {isLoading ? (
              <div className="h-4 w-9 animate-pulse rounded bg-neutral-200" />
            ) : (
              <div className="flex w-9 items-center gap-1 text-xs font-medium">
                <span className="text-neutral-700">{item.value}</span>
                <span className="text-neutral-400">of {item.total}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
