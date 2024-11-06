"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { PayoutCounts } from "@/lib/types";
import { ProgramStats } from "@/ui/programs/program-stats";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { PayoutStatusBadges } from "./payout-table";

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
    // <div className="grid gap-4 md:grid-cols-3">
    //   <PayoutCountCard
    //     title="All"
    //     status={null}
    //     count={pendingPayoutsCount + completedPayoutsCount}
    //     error={!!error}
    //   />

    //   <PayoutCountCard
    //     title="Pending"
    //     status="pending"
    //     count={pendingPayoutsCount}
    //     error={!!error}
    //   />

    //   <PayoutCountCard
    //     title="Paid"
    //     status="completed"
    //     count={completedPayoutsCount}
    //     error={!!error}
    //   />
    // </div>

    <div className="xs:grid-cols-2 xs:divide-x xs:divide-y-0 grid divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200">
      <ProgramStats
        label="Paid"
        status="completed"
        count={completedPayoutsCount}
        icon={PayoutStatusBadges.completed.icon}
        iconClassName={PayoutStatusBadges.completed.className}
        error={!!error}
      />
      <ProgramStats
        label="Pending"
        status="pending"
        count={pendingPayoutsCount}
        icon={PayoutStatusBadges.pending.icon}
        iconClassName={PayoutStatusBadges.pending.className}
        error={!!error}
      />
    </div>
  );
}
