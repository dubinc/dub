"use client";

import usePayoutsCount from "@/lib/swr/use-payouts-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { PayoutStatusBadges } from "@/ui/partners/payout-status-badges";
import { ProgramStatsFilter } from "@/ui/partners/program-stats-filter";
import { MoneyBills2, useRouterStuff } from "@dub/ui";
import { useParams } from "next/navigation";

export function PayoutStats() {
  const { slug, programId } = useParams();
  const { id: workspaceId } = useWorkspace();
  const { queryParams } = useRouterStuff();

  const { payoutsCount, error } = usePayoutsCount();

  return (
    <div className="xs:grid-cols-3 xs:divide-x xs:divide-y-0 grid divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200">
      <ProgramStatsFilter
        label="All"
        href={`/${slug}/programs/${programId}/payouts`}
        count={payoutsCount?.all}
        icon={MoneyBills2}
        iconClassName="text-gray-600 bg-gray-100"
        error={!!error}
      />
      <ProgramStatsFilter
        label="Completed"
        href={
          queryParams({
            set: { status: "completed" },
            getNewPath: true,
          }) as string
        }
        count={payoutsCount?.completed}
        icon={PayoutStatusBadges.completed.icon}
        iconClassName={PayoutStatusBadges.completed.className}
        error={!!error}
      />
      <ProgramStatsFilter
        label="Pending"
        href={
          queryParams({
            set: { status: "pending" },
            getNewPath: true,
          }) as string
        }
        count={payoutsCount?.pending}
        icon={PayoutStatusBadges.pending.icon}
        iconClassName={PayoutStatusBadges.pending.className}
        error={!!error}
      />
    </div>
  );
}
