"use client";

import useCommissionsCount from "@/lib/swr/use-commissions-count";
import { CommissionStatusBadges } from "@/ui/partners/commission-status-badges";
import { ProgramStatsFilter } from "@/ui/partners/program-stats-filter";
import { useRouterStuff } from "@dub/ui";
import { Users } from "@dub/ui/icons";
import { cn } from "@dub/utils";

export type CommissionStatusFilter =
  | "pending"
  | "processed"
  | "paid"
  | undefined;

export type { CommissionStatusFilter as default };

const TABS: { id: CommissionStatusFilter; label: string }[] = [
  { id: undefined, label: "All" },
  { id: "pending", label: "Pending" },
  { id: "processed", label: "Processed" },
  { id: "paid", label: "Paid" },
];

export function CommissionsStatusSelector({
  status,
}: {
  status: CommissionStatusFilter;
}) {
  const { queryParams } = useRouterStuff();

  const { commissionsCount, error } = useCommissionsCount({
    exclude: ["commissionStatus", "pageTab", "event", "saleUnit", "view"],
  });

  function getHref(tabId: CommissionStatusFilter): string {
    if (tabId === undefined) {
      return queryParams({ del: "commissionStatus", getNewPath: true }) as string;
    }
    return queryParams({
      set: { commissionStatus: tabId },
      getNewPath: true,
    }) as string;
  }

  function getIcon(tabId: CommissionStatusFilter) {
    if (tabId === undefined) return Users;
    return CommissionStatusBadges[tabId].icon;
  }

  function getIconClassName(tabId: CommissionStatusFilter) {
    if (tabId === undefined) return "text-neutral-600 bg-neutral-100";
    return CommissionStatusBadges[tabId].className;
  }

  function getCount(tabId: CommissionStatusFilter) {
    const key = tabId ?? "all";
    return commissionsCount?.[key]?.count;
  }

  function getAmount(tabId: CommissionStatusFilter) {
    const key = tabId ?? "all";
    return commissionsCount?.[key]?.earnings;
  }

  const isActive = (tabId: CommissionStatusFilter) => tabId === status;

  return (
    <div className="grid w-full grid-cols-4 divide-x divide-neutral-200 overflow-y-hidden">
      {TABS.map(({ id, label }) => (
        <div key={label} className="relative">
          {/* Active bottom-line indicator — same pattern as AnalyticsTabs */}
          <div
            className={cn(
              "absolute bottom-0 left-0 h-0.5 w-full bg-black transition-transform duration-100",
              !isActive(id) && "translate-y-[3px]",
            )}
          />
          <ProgramStatsFilter
            label={label}
            href={getHref(id)}
            count={getCount(id)}
            amount={getAmount(id)}
            icon={getIcon(id)}
            iconClassName={getIconClassName(id)}
            variant="loose"
            error={!!error}
          />
        </div>
      ))}
    </div>
  );
}
