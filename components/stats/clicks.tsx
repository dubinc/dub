import { Chart } from "@/components/shared/icons";
import BarChart from "@/components/stats/bar-chart";
import { StatsProps } from "@/lib/stats";
import { nFormatter } from "@/lib/utils";

export default function Clicks({
  data,
  isValidating,
}: {
  data: StatsProps;
  isValidating: boolean;
}) {
  return (
    <div className="max-w-4xl border border-gray-200 bg-white p-5 sm:rounded-lg sm:border-gray-100 sm:p-10 sm:pr-20 sm:shadow-lg ">
      <div className="mb-5 text-left">
        <div className="flex items-end space-x-1">
          {isValidating ? (
            <div className="h-10 w-12 animate-pulse rounded-md bg-gray-200" />
          ) : (
            <h1 className="text-3xl font-bold sm:text-4xl">
              {nFormatter(data.totalClicks)}
            </h1>
          )}
          <Chart className="mb-1 h-6 w-6 text-gray-600" />
        </div>
        <p className="text-sm font-medium uppercase text-gray-600">
          Total Clicks
        </p>
      </div>
      {/* @ts-ignore */}
      <BarChart data={data.clicksData} isValidating={isValidating} />
    </div>
  );
}
