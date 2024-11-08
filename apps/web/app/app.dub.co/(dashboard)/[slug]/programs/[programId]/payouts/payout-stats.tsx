"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { PayoutCounts } from "@/lib/types";
import { PayoutStatusBadges } from "@/ui/programs/payout-status-badges";
import { ProgramStats } from "@/ui/programs/program-stats";
import { MoneyBills2, useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";

export function PayoutStats() {
  const { slug, programId } = useParams();
  const { id: workspaceId } = useWorkspace();
  const { queryParams } = useRouterStuff();

  const { data: payoutsCounts, error } = useSWR<PayoutCounts[]>(
    `/api/programs/${programId}/payouts/count?workspaceId=${workspaceId}`,
    fetcher,
  );

  const pendingPayoutsCount =
    payoutsCounts?.find((payout) => payout.status === "pending")?._count || 0;

  const completedPayoutsCount =
    payoutsCounts?.find((payout) => payout.status === "completed")?._count || 0;

  return (
    <div className="xs:grid-cols-3 xs:divide-x xs:divide-y-0 grid divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200">
      <ProgramStats
        label="All"
        href={`/${slug}/programs/${programId}/payouts`}
        count={completedPayoutsCount + pendingPayoutsCount}
        icon={MoneyBills2}
        iconClassName="text-gray-600 bg-gray-100"
        error={!!error}
      />
      <ProgramStats
        label="Paid"
        href={
          queryParams({
            set: { status: "completed" },
            getNewPath: true,
          }) as string
        }
        count={completedPayoutsCount}
        icon={PayoutStatusBadges.completed.icon}
        iconClassName={PayoutStatusBadges.completed.className}
        error={!!error}
      />
      <ProgramStats
        label="Pending"
        href={
          queryParams({
            set: { status: "pending" },
            getNewPath: true,
          }) as string
        }
        count={pendingPayoutsCount}
        icon={PayoutStatusBadges.pending.icon}
        iconClassName={PayoutStatusBadges.pending.className}
        error={!!error}
      />
    </div>
  );
}
