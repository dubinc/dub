"use client";

import { DUB_PARTNERS_ANALYTICS_INTERVAL } from "@/lib/analytics/constants";
import useProgram from "@/lib/swr/use-program";
import SimpleDateRangePicker from "@/ui/shared/simple-date-range-picker";
import { useRouterStuff } from "@dub/ui";
import { IntervalOptions } from "date-fns";
import { useParams } from "next/navigation";
import { ContextType, createContext, useMemo } from "react";

export const ProgramOverviewContext = createContext<{
  start?: string;
  end?: string;
  interval?: IntervalOptions;
}>({});

export default function ProgramOverviewPageClient() {
  const { program } = useProgram();
  const { slug } = useParams();
  const { getQueryString } = useRouterStuff();

  const { searchParamsObj } = useRouterStuff();

  const { start, end, interval } = useMemo(
    () =>
      ({
        interval: DUB_PARTNERS_ANALYTICS_INTERVAL,
        ...searchParamsObj,
      }) as ContextType<typeof ProgramOverviewContext>,
    [searchParamsObj],
  );

  return (
    <div className="@container flex flex-col gap-6">
      <SimpleDateRangePicker align="start" className="w-fit" />
      <div className="@4xl:grid-cols-[minmax(0,1fr)_400px] grid grid-cols-1 gap-6 rounded-2xl bg-neutral-100 p-4">
        {/* Chart */}
        <div className="border-border-subtle @4xl:h-full h-96 rounded-[0.625rem] border bg-white"></div>

        <div className="@4xl:grid-cols-1 grid grid-cols-2 gap-6">
          {/* Tasks */}
          <div className="border-border-subtle h-48 rounded-[0.625rem] border bg-white"></div>

          {/* Program links */}
          <div className="border-border-subtle h-48 rounded-[0.625rem] border bg-white"></div>
        </div>
      </div>
      <div className="@2xl:grid-cols-2 @4xl:grid-cols-3 grid grid-cols-1 gap-6">
        {[...Array(6)].map((_, idx) => (
          <div
            key={idx}
            className="border-border-subtle h-64 rounded-[0.625rem] border bg-white"
          ></div>
        ))}
      </div>
      {/* <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <TopPartners />
        <PendingPayouts />
      </div> */}
    </div>
  );
}
