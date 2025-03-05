"use client";

import useSalesCount from "@/lib/swr/use-sales-count";
import { ProgramStatsFilter } from "@/ui/partners/program-stats-filter";
import { SaleStatusBadges } from "@/ui/partners/sale-status-badges";
import { useRouterStuff } from "@dub/ui";
import { Users } from "@dub/ui/icons";
import { useParams, useSearchParams } from "next/navigation";

export function SaleStats() {
  const { slug, programId } = useParams();
  const { queryParams } = useRouterStuff();
  const searchParams = useSearchParams();
  const { salesCount, error } = useSalesCount({
    exclude: ["status"],
  });

  const view = searchParams.get("view") || "sales";

  return (
    <div className="xs:grid-cols-4 xs:divide-x xs:divide-y-0 grid divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200">
      <ProgramStatsFilter
        label="All"
        href={`/${slug}/programs/${programId}/sales`}
        count={salesCount?.all.count}
        amount={
          view === "sales"
            ? salesCount?.all.amount
            : view === "commissions"
              ? salesCount?.all.earnings
              : undefined
        }
        icon={Users}
        iconClassName="text-neutral-600 bg-neutral-100"
        variant="loose"
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
        count={salesCount?.pending.count}
        amount={
          view === "sales"
            ? salesCount?.pending.amount
            : view === "commissions"
              ? salesCount?.pending.earnings
              : undefined
        }
        icon={SaleStatusBadges.pending.icon}
        iconClassName={SaleStatusBadges.pending.className}
        variant="loose"
        error={!!error}
      />
      <ProgramStatsFilter
        label="Processed"
        href={
          queryParams({
            set: { status: "processed" },
            getNewPath: true,
          }) as string
        }
        count={salesCount?.processed.count}
        amount={
          view === "sales"
            ? salesCount?.processed.amount
            : view === "commissions"
              ? salesCount?.processed.earnings
              : undefined
        }
        icon={SaleStatusBadges.processed.icon}
        iconClassName={SaleStatusBadges.processed.className}
        variant="loose"
        error={!!error}
      />
      <ProgramStatsFilter
        label="Paid"
        href={
          queryParams({
            set: { status: "paid" },
            getNewPath: true,
          }) as string
        }
        count={salesCount?.paid.count}
        amount={
          view === "sales"
            ? salesCount?.paid.amount
            : view === "commissions"
              ? salesCount?.paid.earnings
              : undefined
        }
        icon={SaleStatusBadges.paid.icon}
        iconClassName={SaleStatusBadges.paid.className}
        variant="loose"
        error={!!error}
      />
    </div>
  );
}
