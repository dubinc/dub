"use client";

import { DUB_PARTNERS_ANALYTICS_INTERVAL } from "@/lib/analytics/constants";
import { IntervalOptions } from "@/lib/analytics/types";
import SimpleDateRangePicker from "@/ui/shared/simple-date-range-picker";
import { useRouterStuff } from "@dub/ui";
import { createContext } from "react";
import { AnalyticsChart } from "./analytics-chart";

type ProgramAnalyticsContextType = {
  start?: string;
  end?: string;
  interval?: IntervalOptions;
  event: "sales" | "leads" | "clicks";
};

export const ProgramAnalyticsContext =
  createContext<ProgramAnalyticsContextType>({ event: "sales" });

export function ProgramAnalyticsPageClient() {
  const { searchParamsObj } = useRouterStuff();

  const {
    start,
    end,
    interval = DUB_PARTNERS_ANALYTICS_INTERVAL,
    event = "sales",
  } = searchParamsObj as Partial<ProgramAnalyticsContextType>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <SimpleDateRangePicker align="start" className="w-fit" />
      </div>
      <div className="border-border-subtle rounded-2xl border">
        <div className="p-6">
          <ProgramAnalyticsContext.Provider
            value={{ start, end, interval, event }}
          >
            <AnalyticsChart />
          </ProgramAnalyticsContext.Provider>
        </div>
      </div>
    </div>
  );
}
