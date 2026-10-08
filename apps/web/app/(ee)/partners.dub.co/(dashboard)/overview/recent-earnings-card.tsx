"use client";

import { testIds } from "@/lib/e2e/test-ids";
import { usePartnerProfileEarnings } from "@/lib/swr/use-partner-profile-earnings";
import { CommissionTypeIcon } from "@/ui/partners/comission-type-icon";
import { CommissionStatusBadges } from "@/ui/partners/commission-status-badges";
import { StatusBadge } from "@dub/ui";
import { InvoiceDollar } from "@dub/ui/icons";
import { currencyFormatter, formatDate } from "@dub/utils";
import {
  OVERVIEW_CARD_ROW_CLASSNAME,
  OverviewCard,
  OverviewCardList,
  ProgramLogo,
} from "./overview-card";
import { useOverviewDateRange } from "./use-overview-date-range";

export function RecentEarningsCard() {
  const { start, end, interval } = useOverviewDateRange();

  const { data: earnings, error } = usePartnerProfileEarnings({
    pageSize: 6,
    interval,
    start,
    end,
  });

  return (
    <OverviewCard
      title="Recent earnings"
      className="rounded-2xl"
      testId={testIds.partnerOverview.recentEarnings}
    >
      <OverviewCardList
        items={earnings}
        rowCount={6}
        error={error}
        getKey={(earning) => earning.id}
        emptyState={{
          icon: <InvoiceDollar className="size-4" />,
          title: "No earnings in this date range",
        }}
        renderItem={(earning) => {
          const badge = CommissionStatusBadges[earning.status];

          return (
            <div className={OVERVIEW_CARD_ROW_CLASSNAME}>
              <ProgramLogo program={earning.program} />
              <CommissionTypeIcon type={earning.type} className="shrink-0" />
              <span className="text-content-emphasis min-w-0 grow truncate text-xs font-semibold">
                {formatDate(earning.createdAt, { month: "short" })}
              </span>
              {badge && (
                <StatusBadge icon={null} variant={badge.variant}>
                  {badge.label}
                </StatusBadge>
              )}
              <span className="w-16 shrink-0 text-right text-xs font-medium text-neutral-500">
                {currencyFormatter(earning.earnings)}
              </span>
            </div>
          );
        }}
      />
    </OverviewCard>
  );
}
