import { nFormatter } from "@/lib/utils";
import { Chart } from "@/components/shared/icons";
import BarChart from "@/components/stats/bar-chart";
import { StatsProps } from "@/lib/stats";

export default function Clicks({
  data,
  isValidating,
}: {
  data: StatsProps;
  isValidating: boolean;
}) {
  return (
    <div className="max-w-4xl bg-white p-10 pr-20 shadow-lg rounded-lg border border-gray-100">
      <div className="mb-5 text-left">
        <div className="flex space-x-1 items-end">
          {isValidating ? (
            <div className="h-10 w-12 rounded-md bg-gray-200 animate-pulse" />
          ) : (
            <h1 className="text-3xl sm:text-4xl font-bold">
              {nFormatter(data.totalClicks)}
            </h1>
          )}
          <Chart className="text-gray-600 w-6 h-6 mb-1" />
        </div>
        <p className="uppercase text-gray-600 text-sm font-medium">
          Total Clicks
        </p>
      </div>
      {/* @ts-ignore */}
      <BarChart data={data.clicksData} isValidating={isValidating} />
    </div>
  );
}
