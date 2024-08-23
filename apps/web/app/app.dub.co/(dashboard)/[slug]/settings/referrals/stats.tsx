import { getReferralLink } from "@/lib/actions/get-referral-link";
import { getTotalEvents } from "@/lib/actions/get-total-events";
import { dub } from "@/lib/dub";
import { StatCard, StatCardSkeleton } from "@dub/blocks";
import { CountingNumbers } from "@dub/ui";
import {
  ClicksTimeseries,
  SalesTimeseries,
} from "dub/dist/commonjs/models/components";
import { Suspense } from "react";

export function Stats({ slug }: { slug: string }) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
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
  const link = await getReferralLink(slug);
  if (!link) {
    return [...Array(2)].map(() => <StatCardSkeleton error />);
  }

  try {
    const { totalClicks, clicks, totalSales, sales } = await loadData(link.id);

    return (
      <>
        <StatCard label="Clicks" timeseriesData={clicks}>
          <CountingNumbers>{totalClicks}</CountingNumbers>
        </StatCard>
        <StatCard label="Sales" timeseriesData={sales}>
          <CountingNumbers prefix="$" fullNumber>
            {totalSales / 100}
          </CountingNumbers>
        </StatCard>
      </>
    );
  } catch (e) {
    console.error("Failed to load referral stats", e);
  }

  return [...Array(2)].map(() => <StatCardSkeleton error />);
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
  };
}
