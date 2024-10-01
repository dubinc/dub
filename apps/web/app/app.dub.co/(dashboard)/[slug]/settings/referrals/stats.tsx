"use client";

import { getTotalEvents } from "@/lib/actions/get-total-events";
import { dub } from "@/lib/dub";
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
import { AnalyticsTimeseries } from "dub/dist/commonjs/models/components";

export function Stats() {
  const { analytics, isLoading } = useAnalytics();

  return <StatsInner />;

  // return (
  //   <div className="grid grid-cols-1 gap-x-4 gap-y-4 md:grid-cols-2 lg:gap-x-6">
  //     {isLoading ? (
  //       [...Array(2)].map(() => <StatsCardSkeleton />)
  //     ) : (
  //       <StatsInner />
  //     )}
  //   </div>
  // );
}

const StatsInner = () => {
  const { totalSales, sales, referredSignups, clicksQuotaBonus } =
    await loadData(link.id);

  return (
    <>
      <StatsCard
        label="Affiliate Earnings"
        graphic={<MiniAreaChart data={sales} />}
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
              <CountingNumbers>{referredSignups}</CountingNumbers>
            </div>
          </Gauge>
        }
      >
        <CountingNumbers variant="full">{clicksQuotaBonus}</CountingNumbers>
      </StatsCard>
    </>
  );

  return [...Array(2)].map(() => <StatsCardSkeleton error />);
};

async function loadData(linkId: string) {
  const [clicks, sales, totalEvents] = await Promise.all([
    // Clicks timeseries
    dub.analytics.retrieve({
      linkId,
      event: "clicks",
      interval: "30d",
      groupBy: "timeseries",
    }) as Promise<AnalyticsTimeseries[]>,

    // Sales timeseries
    dub.analytics.retrieve({
      linkId,
      event: "sales",
      interval: "30d",
      groupBy: "timeseries",
    }) as Promise<AnalyticsTimeseries[]>,

    // Total events
    getTotalEvents(linkId),
  ]);

  return {
    totalClicks: totalEvents.clicks,
    clicks: clicks.map((d) => ({
      date: new Date(d.start),
      value: d.clicks,
    })),
    totalSales: totalEvents.saleAmount ?? 0,
    sales: sales.map((d) => ({
      date: new Date(d.start),
      value: d.saleAmount ?? 0,
    })),
    referredSignups: Math.min(totalEvents.leads ?? 0, 32),
    clicksQuotaBonus: Math.min(
      (totalEvents.leads ?? 0) * REFERRAL_CLICKS_QUOTA_BONUS,
      REFERRAL_CLICKS_QUOTA_BONUS_MAX,
    ),
  };
}
