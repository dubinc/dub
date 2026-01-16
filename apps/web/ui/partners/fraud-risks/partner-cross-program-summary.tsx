"use client";

import { usePartnerCrossProgramSummary } from "@/lib/swr/use-partner-cross-program-summary";
import { ActivityRing, User, UserCheck, UserXmark } from "@dub/ui";

export function PartnerCrossProgramSummary({
  partnerId,
}: {
  partnerId: string;
}) {
  const { crossProgramSummary, isLoading } = usePartnerCrossProgramSummary({
    partnerId,
  });

  if (isLoading || !crossProgramSummary) {
    return <LoadingSkeleton />;
  }

  const { totalPrograms, trustedPrograms, bannedPrograms } =
    crossProgramSummary;

  return (
    <div className="flex items-center gap-3">
      <ActivityRing
        positiveValue={trustedPrograms}
        negativeValue={bannedPrograms}
        positiveIcon={UserCheck}
        negativeIcon={UserXmark}
        neutralIcon={User}
      />
      <div className="flex min-w-0 grow flex-col gap-[5px]">
        <StatRow
          label="Marked as trustworthy"
          value={trustedPrograms}
          total={totalPrograms}
        />
        <StatRow
          label="Banned from programs"
          value={bannedPrograms}
          total={totalPrograms}
        />
      </div>
    </div>
  );
}

function StatRow({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) {
  return (
    <div className="flex items-center justify-between gap-6">
      <span className="text-xs font-medium text-neutral-700">{label}</span>
      <div className="flex items-center gap-1 text-xs">
        <span className="font-semibold text-neutral-800">{value}</span>
        <span className="font-medium text-neutral-500">of {total}</span>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <div className="size-10 shrink-0 animate-pulse rounded-full bg-neutral-200" />
      <div className="flex min-w-0 grow flex-col gap-[5px]">
        <div className="flex items-center justify-between gap-6">
          <div className="h-4 w-28 animate-pulse rounded bg-neutral-200" />
          <div className="flex items-center gap-1">
            <div className="h-4 w-4 animate-pulse rounded bg-neutral-200" />
            <div className="h-4 w-7 animate-pulse rounded bg-neutral-200" />
          </div>
        </div>
        <div className="flex items-center justify-between gap-6">
          <div className="h-4 w-32 animate-pulse rounded bg-neutral-200" />
          <div className="flex items-center gap-1">
            <div className="h-4 w-4 animate-pulse rounded bg-neutral-200" />
            <div className="h-4 w-7 animate-pulse rounded bg-neutral-200" />
          </div>
        </div>
      </div>
    </div>
  );
}
