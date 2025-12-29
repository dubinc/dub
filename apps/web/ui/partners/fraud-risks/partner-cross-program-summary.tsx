"use client";

import { usePartnerCrossProgramSummary } from "@/lib/swr/use-partner-cross-program-summary";
import { UserCheck, UserXmark } from "@dub/ui";

export function PartnerCrossProgramSummary({
  partnerId,
}: {
  partnerId: string;
}) {
  const { crossProgramSummary, isLoading } = usePartnerCrossProgramSummary({
    partnerId,
  });

  const crossProgramMetrics = [
    {
      icon: UserCheck,
      text: "Marked as trustworthy",
      total: crossProgramSummary?.totalPrograms,
      value: crossProgramSummary?.trustedPrograms,
    },
    {
      icon: UserXmark,
      text: "Banned from programs",
      total: crossProgramSummary?.totalPrograms,
      value: crossProgramSummary?.bannedPrograms,
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

          <div className="w-10">
            {isLoading || !crossProgramSummary ? (
              <div className="h-4 w-full animate-pulse justify-end rounded bg-neutral-200" />
            ) : (
              <div className="flex items-center justify-end gap-1 text-xs font-medium">
                <span className="text-neutral-700">{item.value || 0}</span>
                <span className="whitespace-nowrap text-neutral-400">
                  of {item.total || 0}
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
    </>
  );
}
