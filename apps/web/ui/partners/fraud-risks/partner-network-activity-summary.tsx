"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { partnerNetworkActivitySummarySchema } from "@/lib/zod/schemas/partners";
import { ActivityRing, User, UserCheck, UserXmark } from "@dub/ui";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import * as z from "zod/v4";

type NetworkActivitySummary = z.infer<
  typeof partnerNetworkActivitySummarySchema
>;

export function PartnerNetworkActivitySummary({
  partnerId,
}: {
  partnerId: string;
}) {
  const { id: workspaceId } = useWorkspace();

  const { data, isLoading } = useSWR<NetworkActivitySummary>(
    workspaceId
      ? `/api/partners/${partnerId}/network-activity?workspaceId=${workspaceId}`
      : null,
    fetcher,
    {
      revalidateOnMount: true,
    },
  );

  if (!data || isLoading) {
    return <LoadingSkeleton />;
  }

  const { totalPrograms, activePrograms, bannedPrograms } = data;

  return (
    <div className="flex w-full items-center gap-3">
      <ActivityRing
        positiveValue={activePrograms}
        negativeValue={bannedPrograms}
        positiveIcon={UserCheck}
        negativeIcon={UserXmark}
        neutralIcon={User}
      />
      <div className="flex min-w-0 grow flex-col gap-[5px]">
        <StatRow
          label="Active programs"
          value={activePrograms}
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
        <span className="font-semibold tabular-nums text-neutral-800">
          {value}
        </span>
        <span className="font-medium tabular-nums text-neutral-500">
          of {total}
        </span>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex w-full items-center gap-3">
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
