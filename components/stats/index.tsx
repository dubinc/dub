import { RawStatsProps } from "@/lib/stats";
import Toggle from "@/components/stats/toggle";
import StatsChart from "@/components/stats/stats-chart";

export default function Stats({
  _key,
  stats,
}: {
  _key: string;
  stats: RawStatsProps[];
}) {
  return (
    <div className="flex justify-center bg-gray-50 dark:bg-black">
      <div className="my-36">
        <Toggle />
        {/* @ts-ignore */}
        <StatsChart _key={_key} stats={stats} />
        <div className="grid grid-cols-2 sm:grid-cols-1 mt-10"></div>
      </div>
    </div>
  );
}
