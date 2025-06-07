"use client";

import useCommissionsCount from "@/lib/swr/use-commissions-count";
import { CommissionStatusBadges } from "@/ui/partners/commission-status-badges";
import { ProgramStatsFilter } from "@/ui/partners/program-stats-filter";
import { useRouterStuff } from "@dub/ui";
import { Users } from "@dub/ui/icons";
import { useParams } from "next/navigation";

export function CommissionStats() {
  const { slug } = useParams();
  const { queryParams } = useRouterStuff();
  const { commissionsCount, error } = useCommissionsCount({
    exclude: ["status", "page"],
  });

  return (
    <div className="xs:grid-cols-4 xs:divide-x xs:divide-y-0 grid divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200">
      <ProgramStatsFilter
        label="All"
        href={`/${slug}/program/commissions`}
        count={commissionsCount?.all.count}
        amount={commissionsCount?.all.earnings}
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
        count={commissionsCount?.pending.count}
        amount={commissionsCount?.pending.earnings}
        icon={CommissionStatusBadges.pending.icon}
        iconClassName={CommissionStatusBadges.pending.className}
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
        count={commissionsCount?.processed.count}
        amount={commissionsCount?.processed.earnings}
        icon={CommissionStatusBadges.processed.icon}
        iconClassName={CommissionStatusBadges.processed.className}
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
        count={commissionsCount?.paid.count}
        amount={commissionsCount?.paid.earnings}
        icon={CommissionStatusBadges.paid.icon}
        iconClassName={CommissionStatusBadges.paid.className}
        variant="loose"
        error={!!error}
      />
    </div>
  );
}
