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

type PartnerNetworkActivitySummaryState =
  | { status: "empty" }
  | { status: "error" }
  | { status: "loading" }
  | { status: "ready"; data: NetworkActivitySummary };

function usePartnerNetworkActivitySummary(
  partnerId: string,
): PartnerNetworkActivitySummaryState {
  const { id: workspaceId, error: workspaceError } = useWorkspace();

  const { data, error, isLoading } = useSWR<
    NetworkActivitySummary | null,
    Error & { status: number }
  >(
    workspaceId &&
      partnerId &&
      `/api/partners/${partnerId}/network-activity?workspaceId=${workspaceId}`,
    fetcher,
    {
      revalidateOnMount: true,
      shouldRetryOnError: (fetchError) => fetchError.status !== 404,
    },
  );

  const isUnrelatedPartner = !error && data === null;

  // A partner with neither an application nor an enrollment in the program returns null. Missing data here is an empty result, not a request still loading.
  if (!partnerId || isUnrelatedPartner) {
    return {
      status: "empty",
    };
  }

  if (error || (workspaceError && !workspaceId)) {
    return {
      status: "error",
    };
  }

  if (!data || isLoading) {
    return {
      status: "loading",
    };
  }

  return {
    status: "ready",
    data,
  };
}

export function PartnerNetworkActivitySummary({
  partnerId,
}: {
  partnerId: string;
}) {
  const summary = usePartnerNetworkActivitySummary(partnerId);

  if (summary.status === "empty") {
    return <p className="text-content-subtle text-xs">No network activity</p>;
  }

  if (summary.status === "error") {
    return (
      <p className="text-content-subtle text-xs">
        Failed to load network activity
      </p>
    );
  }

  if (summary.status === "loading") {
    return <LoadingSkeleton />;
  }

  const { totalPrograms, activePrograms, bannedPrograms } = summary.data;

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
