"use client";

import { useParterCrossProgramSummary } from "@/lib/swr/use-partner-cross-program-summary";
import { UserCheck, UserXmark } from "@dub/ui";

export function PartnerCrossProgramSummary({
  partnerId,
}: {
  partnerId: string;
}) {
  const { crossProgramSummary, isLoading } = useParterCrossProgramSummary({
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
    <>
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
            <div className="h-4 w-9 animate-pulse justify-end rounded bg-neutral-200" />
          ) : (
            <div className="flex w-9 items-center justify-end gap-1 text-xs font-medium">
              <span className="text-neutral-700">{item.value}</span>
              <span className="text-neutral-400">of {item.total}</span>
            </div>
          )}
        </div>
      ))}
    </>
  );
}
