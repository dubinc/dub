"use client";

import useSalesCount from "@/lib/swr/use-sales-count";
import { ProgramStatsFilter } from "@/ui/partners/program-stats-filter";
import { useRouterStuff } from "@dub/ui";
import { Users } from "@dub/ui/src/icons";
import { useParams } from "next/navigation";
import { SaleStatusBadges } from "./sale-table";

export function SaleStats() {
  const { slug, programId } = useParams();
  const { queryParams } = useRouterStuff();

  const { salesCount, error } = useSalesCount();

  return (
    <div className="xs:grid-cols-4 xs:divide-x xs:divide-y-0 grid divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200">
      <ProgramStatsFilter
        label="All"
        href={`/${slug}/programs/${programId}/sales`}
        count={salesCount?.all}
        icon={Users}
        iconClassName="text-gray-600 bg-gray-100"
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
        count={salesCount?.pending}
        icon={SaleStatusBadges.pending.icon}
        iconClassName={SaleStatusBadges.pending.className}
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
        count={salesCount?.processed}
        icon={SaleStatusBadges.processed.icon}
        iconClassName={SaleStatusBadges.processed.className}
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
        count={salesCount?.paid}
        icon={SaleStatusBadges.paid.icon}
        iconClassName={SaleStatusBadges.paid.className}
        error={!!error}
      />
    </div>
  );
}
