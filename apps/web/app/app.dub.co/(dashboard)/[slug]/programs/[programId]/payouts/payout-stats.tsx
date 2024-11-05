"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { PayoutCounts } from "@/lib/types";
import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { PayoutStatus } from "@prisma/client";
import useSWR from "swr";

export function PayoutStats({ programId }: { programId: string }) {
  const { id: workspaceId } = useWorkspace();

  const { data: payoutsCounts, error } = useSWR<PayoutCounts[]>(
    `/api/programs/${programId}/payouts/count?workspaceId=${workspaceId}`,
    fetcher,
  );

  const pendingPayoutsCount =
    payoutsCounts?.find((payout) => payout.status === "pending")?._count || 0;

  const completedPayoutsCount =
    payoutsCounts?.find((payout) => payout.status === "completed")?._count || 0;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <PayoutCountCard
        title="All"
        status={null}
        count={pendingPayoutsCount + completedPayoutsCount}
        error={!!error}
      />

      <PayoutCountCard
        title="Pending"
        status="pending"
        count={pendingPayoutsCount}
        error={!!error}
      />

      <PayoutCountCard
        title="Paid"
        status="completed"
        count={completedPayoutsCount}
        error={!!error}
      />
    </div>
  );
}

function PayoutCountCard({
  title,
  status,
  count,
  error,
}: {
  title: string;
  status: PayoutStatus | null;
  count?: number;
  error: boolean;
}) {
  const { queryParams } = useRouterStuff();

  return (
    <button
      type="button"
      onClick={() =>
        queryParams(status === null ? { del: "status" } : { set: { status } })
      }
      className="flex flex-col items-start justify-start gap-1 rounded-lg border border-neutral-300 px-4 py-3 text-left transition-colors duration-75 hover:bg-gray-50 active:bg-gray-100"
    >
      <div className="text-sm font-normal text-neutral-500">{title}</div>
      <div className="text-lg font-semibold leading-tight text-neutral-800">
        {error ? "-" : count}
      </div>
    </button>
  );
}
