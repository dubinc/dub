import { nFormatter } from "@/lib/utils";
import { Chart } from "@/components/shared/icons";
import BarChart from "@/components/stats/charts/bar";
import { StatsProps } from "@/lib/stats";

export default function Clicks({ data }: { data: StatsProps }) {
  return (
    <div className="bg-white dark:bg-black p-10 pr-20 shadow-lg dark:shadow-none rounded-lg border border-gray-100 dark:border-gray-600">
      <div className="mb-5 text-left">
        <div className="flex space-x-1 items-end">
          <h1 className="text-3xl sm:text-4xl dark:text-white font-bold">
            {nFormatter(data.totalClicks)}
          </h1>
          <Chart className="text-gray-600 dark:text-gray-400 w-6 h-6 mb-1" />
        </div>
        <p className="uppercase text-gray-600 dark:text-gray-400 text-sm font-medium">
          Total Clicks
        </p>
      </div>
      {/* @ts-ignore */}
      <BarChart data={data.clicksData} />
    </div>
  );
}
