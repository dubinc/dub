import { getReferralLink } from "@/lib/actions/get-referral-link";
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
} from "@dub/blocks";
import { CountingNumbers } from "@dub/ui";
import { User } from "@dub/ui/src/icons";
import { nFormatter, randomValue } from "@dub/utils";
import { subDays } from "date-fns";
import {
  ClicksTimeseries,
  SalesTimeseries,
} from "dub/dist/commonjs/models/components";
import { Suspense } from "react";

export function Stats({ slug }: { slug: string }) {
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-4 md:grid-cols-2 lg:gap-x-6">
      <Suspense
        fallback={[...Array(2)].map(() => (
          <StatsCardSkeleton />
        ))}
      >
        <StatsInner slug={slug} />
      </Suspense>
    </div>
  );
}

async function StatsInner({ slug }: { slug: string }) {
  try {
    const link = await getReferralLink(slug);
    if (!link) {
      return (
        <>
          <StatsCard
            label="Affiliate Earnings"
            demo
            graphic={
              <MiniAreaChart
                // generate a random bell curve
                data={[...Array(16)].map((_, idx) => {
                  const x = (idx - 7.5) / 4;
                  const curve1 = 800 * Math.exp(-Math.pow(x + 0.5, 2));
                  const curve2 = 600 * Math.exp(-Math.pow(x - 0.5, 2));
                  return {
                    date: subDays(new Date(), 15 - idx),
                    value: Math.floor(
                      1500 + curve1 + curve2 + (Math.random() - 0.5) * 200,
                    ),
                  };
                })}
              />
            }
          >
            ${Math.floor(Math.random() * 50) + 50}
          </StatsCard>
          <StatsCard
            label="Clicks Quota Earned"
            demo
            graphic={
              <Gauge value={2500} max={REFERRAL_CLICKS_QUOTA_BONUS_MAX}>
                <div className="flex items-end gap-1 text-xs font-medium text-gray-500">
                  <User className="size-4" />
                  <CountingNumbers>5</CountingNumbers>
                </div>
              </Gauge>
            }
          >
            {nFormatter(randomValue([1000, 1500, 2000, 2500, 3000]), {
              full: true,
            })}
          </StatsCard>
        </>
      );
    }

    const { totalSales, sales, referredSignups, clicksQuotaBonus } =
      await loadData(link.id);

    return (
      <>
        <StatsCard
          label="Affiliate Earnings"
          graphic={<MiniAreaChart data={sales} />}
        >
          <CountingNumbers prefix="$" fullNumber>
            {(totalSales / 100) * REFERRAL_REVENUE_SHARE}
          </CountingNumbers>
        </StatsCard>
        <StatsCard
          label="Clicks Quota Earned"
          graphic={
            <Gauge
              value={clicksQuotaBonus}
              max={REFERRAL_CLICKS_QUOTA_BONUS_MAX}
            >
              <div className="flex items-end gap-1 text-xs font-medium text-gray-500">
                <User className="size-4" />
                <CountingNumbers>{referredSignups}</CountingNumbers>
              </div>
            </Gauge>
          }
        >
          <CountingNumbers fullNumber>{clicksQuotaBonus}</CountingNumbers>
        </StatsCard>
      </>
    );
  } catch (e) {
    console.error("Failed to load referral stats", e);
  }

  return [...Array(2)].map(() => <StatsCardSkeleton error />);
}

async function loadData(linkId: string) {
  const [clicks, sales, totalEvents] = await Promise.all([
    // Clicks timeseries
    dub.analytics.retrieve({
      linkId,
      event: "clicks",
      interval: "30d",
      groupBy: "timeseries",
    }) as Promise<ClicksTimeseries[]>,

    // Sales timeseries
    dub.analytics.retrieve({
      linkId,
      event: "sales",
      interval: "30d",
      groupBy: "timeseries",
    }) as Promise<SalesTimeseries[]>,

    // Total events
    getTotalEvents(linkId),
  ]);

  return {
    totalClicks: totalEvents.clicks,
    clicks: clicks.map((d) => ({
      date: new Date(d.start),
      value: d.clicks,
    })),
    totalSales: totalEvents.amount,
    sales: sales.map((d) => ({
      date: new Date(d.start),
      value: d.amount,
    })),
    referredSignups: Math.min(totalEvents.leads, 32),
    clicksQuotaBonus: Math.min(
      totalEvents.leads * REFERRAL_CLICKS_QUOTA_BONUS,
      REFERRAL_CLICKS_QUOTA_BONUS_MAX,
    ),
  };
}
