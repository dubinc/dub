"use client";

import { MiniAreaChart } from "@dub/blocks";
import { LoadingSpinner } from "@dub/ui/src/icons";
import { nFormatter } from "@dub/utils";
import { useContext } from "react";
import { ProgramOverviewContext } from "./context";
import useReferralAnalytics from "./use-referral-analytics";

export function StatCard({
  title,
  event,
}: {
  title: string;
  event: "clicks" | "leads" | "sales";
}) {
  const { start, end, interval, color } = useContext(ProgramOverviewContext);

  const { data: total } = useReferralAnalytics({
    interval,
    start,
    end,
  });

  const { data: timeseries, error } = useReferralAnalytics({
    groupBy: "timeseries",
    interval,
    start,
    end,
    event,
  });

  return (
    <div className="hover:drop-shadow-card-hover block rounded-md border border-neutral-300 bg-white p-5 transition-[filter]">
      <span className="block text-sm text-neutral-500">{title}</span>
      {total !== undefined ? (
        <span className="block text-2xl text-neutral-800">
          {nFormatter(total[event])}
        </span>
      ) : (
        <div className="h-8 w-16 animate-pulse rounded-md bg-neutral-200" />
      )}
      <div className="mt-2 h-16 w-full">
        {timeseries ? (
          <MiniAreaChart
            data={timeseries.map((d) => ({
              date: new Date(d.start),
              value: d[event],
            }))}
            curve={false}
            color={color}
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            {error ? (
              <span className="text-sm text-neutral-500">
                Failed to load data.
              </span>
            ) : (
              <LoadingSpinner />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
