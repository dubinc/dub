"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { PartnerCounts } from "@/lib/types";
import { Icon, useRouterStuff } from "@dub/ui";
import { CircleCheck, CircleHalfDottedClock } from "@dub/ui/src/icons";
import { cn, fetcher } from "@dub/utils";
import { PartnerStatus } from "@prisma/client";
import useSWR from "swr";

export function PartnerStats({ programId }: { programId: string }) {
  const { id: workspaceId } = useWorkspace();

  const { data: partnersCounts, error } = useSWR<PartnerCounts[]>(
    `/api/programs/${programId}/partners/count?workspaceId=${workspaceId}`,
    fetcher,
  );

  const activePartnersCount =
    partnersCounts?.find(({ status }) => status === "approved")?._count || 0;

  const pendingPartnersCount =
    partnersCounts?.find(({ status }) => status === "pending")?._count || 0;

  return (
    <div className="xs:grid-cols-2 xs:divide-x xs:divide-y-0 grid divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200">
      <PartnerStatusStat
        label="Active"
        status="approved"
        count={partnersCounts ? activePartnersCount : undefined}
        icon={CircleCheck}
        iconClassName="bg-green-100 text-green-600"
        error={!!error}
      />
      <PartnerStatusStat
        label="Pending"
        status="pending"
        count={partnersCounts ? pendingPartnersCount : undefined}
        icon={CircleHalfDottedClock}
        iconClassName="bg-orange-100 text-orange-600"
        error={!!error}
      />
    </div>
  );
}

function PartnerStatusStat({
  label,
  status,
  count,
  icon: Icon,
  iconClassName,
  error,
}: {
  label: string;
  status: PartnerStatus;
  count: number | undefined;
  icon: Icon;
  iconClassName?: string;
  error: boolean;
}) {
  const { queryParams } = useRouterStuff();
  return (
    <button
      type="button"
      className="flex items-center gap-4 p-3 text-left transition-colors duration-75 hover:bg-gray-50 active:bg-gray-100"
      onClick={() => queryParams({ set: { status } })}
    >
      <div
        className={cn(
          "flex size-10 items-center justify-center rounded-md",
          iconClassName,
        )}
      >
        <Icon className="size-4.5" />
      </div>
      <div>
        <div className="text-xs text-neutral-500">{label}</div>
        {count !== undefined || error ? (
          <div className="text-base font-medium leading-tight text-neutral-800">
            {error ? "-" : count}
          </div>
        ) : (
          <div className="h-5 w-10 min-w-0 animate-pulse rounded-md bg-neutral-200" />
        )}
      </div>
    </button>
  );
}
