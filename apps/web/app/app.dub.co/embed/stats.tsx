"use client";

import {
  REFERRAL_CLICKS_QUOTA_BONUS,
  REFERRAL_CLICKS_QUOTA_BONUS_MAX,
  REFERRAL_REVENUE_SHARE,
} from "@/lib/referrals/constants";
import {
  Gauge,
  MiniAreaChart,
  StatsCard,
  StatsCardSkeleton,
  useAnalytics,
} from "@dub/blocks";
import { CountingNumbers } from "@dub/ui";
import { User } from "@dub/ui/src/icons";
import {
  AnalyticsCount,
  AnalyticsTimeseries,
} from "dub/dist/commonjs/models/components";

interface StatsInnerProps {
  totalEvents: AnalyticsCount;
  sales: AnalyticsTimeseries[];
}

export const Stats = () => {
  const { analytics: sales, isLoading: isLoadingSales } = useAnalytics({
    event: "sales",
    interval: "90d",
    groupBy: "timeseries",
  });

  const { analytics: totalEvents, isLoading: isLoadingTotalEvents } =
    useAnalytics({
      event: "composite",
      interval: "all_unfiltered",
      groupBy: "count",
    });

  const loading = isLoadingSales || isLoadingTotalEvents;

  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-4 md:grid-cols-2 lg:gap-x-6">
      {loading ? (
        [...Array(2)].map(() => <StatsCardSkeleton />)
      ) : (
        <StatsInner
          totalEvents={totalEvents as AnalyticsCount}
          sales={sales as AnalyticsTimeseries[]}
        />
      )}
    </div>
  );
};

const StatsInner = ({ totalEvents, sales }: StatsInnerProps) => {
  const totalLeads = Math.min(totalEvents.leads ?? 0, 32);
  const totalSales = totalEvents.saleAmount ?? 0;

  const clicksQuotaBonus = Math.min(
    totalLeads * REFERRAL_CLICKS_QUOTA_BONUS,
    REFERRAL_CLICKS_QUOTA_BONUS_MAX,
  );

  const salesData = sales.map((sale) => ({
    date: new Date(sale.start),
    value: sale.saleAmount ?? 0,
  }));

  return (
    <>
      <StatsCard
        label="Affiliate Earnings"
        graphic={<MiniAreaChart data={salesData} />}
      >
        <CountingNumbers prefix="$" variant="full">
          {(totalSales / 100) * REFERRAL_REVENUE_SHARE}
        </CountingNumbers>
      </StatsCard>

      <StatsCard
        label="Clicks Quota Earned"
        graphic={
          <Gauge value={clicksQuotaBonus} max={REFERRAL_CLICKS_QUOTA_BONUS_MAX}>
            <div className="flex items-end gap-1 text-xs font-medium text-gray-500">
              <User className="size-4" />
              <CountingNumbers>{totalLeads}</CountingNumbers>
            </div>
          </Gauge>
        }
      >
        <CountingNumbers variant="full">{clicksQuotaBonus}</CountingNumbers>
      </StatsCard>
    </>
  );
};
