import { PropsWithChildren } from "react";
import { MiniAreaChart, MiniAreaChartProps } from "./mini-area-chart";

const wrapperClassName =
  "flex justify-between gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 text-left";

export function StatCard({
  label,
  timeseriesData,
  children,
}: PropsWithChildren<{
  label: string;
  timeseriesData: MiniAreaChartProps["data"];
}>) {
  return (
    <div className={wrapperClassName}>
      <div className="flex flex-col gap-2">
        <span className="text-sm text-gray-600">{label}</span>
        <span className="text-2xl font-medium">{children}</span>
      </div>
      {timeseriesData && (
        <div className="relative h-full min-w-0 max-w-[140px] grow">
          <MiniAreaChart data={timeseriesData} />
        </div>
      )}
    </div>
  );
}

export function StatCardSkeleton({ error }: { error?: boolean }) {
  return (
    <div className={wrapperClassName}>
      {error ? (
        <div className="flex h-[60px] w-full items-center justify-center text-sm text-gray-500">
          Failed to load data
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <span className="h-[22px] w-16 animate-pulse rounded-full bg-gray-200" />
          <span className="h-[30px] w-32 animate-pulse rounded-full bg-gray-200" />
        </div>
      )}
    </div>
  );
}
