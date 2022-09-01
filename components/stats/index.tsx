import dynamic from "next/dynamic";
import { Suspense } from "react";
import { RawStatsProps } from "@/lib/stats";
import StatsChart from "@/components/stats/stats-chart";
const StatsMap = dynamic(() => import("@/components/stats/stats-map"), {
  suspense: true,
}); // the map takes a while to load so we'll dynamically import it with suspense

export default function Stats({
  _key,
  stats,
}: {
  _key: string;
  stats: RawStatsProps[];
}) {
  return (
    <div className="flex flex-col justify-center items-center my-36">
      {/* @ts-ignore */}
      <StatsChart _key={_key} stats={stats} />
      <div className="h-20" />
      <Suspense fallback={<div>Loading...</div>}>
        {/* @ts-ignore */}
        <StatsMap _key={_key} stats={stats} />
      </Suspense>
    </div>
  );
}
