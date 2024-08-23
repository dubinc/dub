import { getReferralLink } from "@/lib/actions/get-referral-link";
import { getTotalEvents } from "@/lib/actions/get-total-events";
import { dub } from "@/lib/dub";
import { getWorkspace } from "@/lib/fetchers";
import { getReferralClicksQuotaBonus } from "@/lib/referrals";
import {
  REFERRAL_CLICKS_QUOTA_BONUS_MAX,
  REFERRAL_REVENUE_SHARE,
} from "@/lib/referrals/constants";
import { Gauge, MiniAreaChart, StatCard, StatCardSkeleton } from "@dub/blocks";
import { CountingNumbers } from "@dub/ui";
import { User } from "@dub/ui/src/icons";
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
          <StatCardSkeleton />
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
          <StatCard label="Affiliate Earnings" demo>
            $60
          </StatCard>
          <StatCard label="Clicks Quota Earned" demo>
            500
          </StatCard>
        </>
      );
    }

    const { totalSales, sales, referredSignups, clicksQuotaBonus } =
      await loadData({
        linkId: link.id,
        slug,
      });

    return (
      <>
        <StatCard
          label="Affiliate Earnings"
          graphic={<MiniAreaChart data={sales} />}
        >
          <CountingNumbers prefix="$" fullNumber>
            {(totalSales / 100) * REFERRAL_REVENUE_SHARE}
          </CountingNumbers>
        </StatCard>
        <StatCard
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
        </StatCard>
      </>
    );
  } catch (e) {
    console.error("Failed to load referral stats", e);
  }

  return [...Array(2)].map(() => <StatCardSkeleton error />);
}

async function loadData({ linkId, slug }: { linkId: string; slug: string }) {
  const [clicks, sales, totalEvents, workspace] = await Promise.all([
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

    // Workspace
    getWorkspace({ slug }),
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
    referredSignups: workspace?.referredSignups ?? 0,
    clicksQuotaBonus: workspace ? getReferralClicksQuotaBonus(workspace) : 0,
  };
}
