import { AnalyticsResponseOptions } from "@/lib/analytics/types";
import { editQueryString } from "@/lib/analytics/utils";
import useWorkspace from "@/lib/swr/use-workspace";
import { AnalyticsContext } from "@/ui/analytics/analytics-provider";
import { LoadingSpinner, useRouterStuff } from "@dub/ui";
import { cn, fetcher, nFormatter } from "@dub/utils";
import { useContext, useMemo, useState } from "react";
import useSWR from "swr";
import { ProgramOverviewBlock } from "../program-overview-block";

export function SaleTypeBlock() {
  const { slug: workspaceSlug } = useWorkspace();

  const { getQueryString } = useRouterStuff();
  const { queryString, totalEvents } = useContext(AnalyticsContext);

  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const {
    data: recurringEvents,
    isLoading: isLoadingRecurring,
    error,
  } = useSWR<{
    [key in AnalyticsResponseOptions]: number;
  }>(
    `/api/analytics?${editQueryString(queryString, {
      event: "sales",
      groupBy: "count",
      saleType: "recurring",
    })}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  const isLoading = isLoadingRecurring || !totalEvents;

  const items = useMemo(() => {
    if (!totalEvents || !recurringEvents) return [];

    return [
      {
        label: "First",
        count: totalEvents.sales - recurringEvents.sales,
        fraction: 1 - recurringEvents.sales / (totalEvents.sales || 1),
        colorClassName: "text-violet-500",
      },
      {
        label: "Recurring",
        count: recurringEvents.sales,
        fraction: recurringEvents.sales / (totalEvents.sales || 1),
        colorClassName: "text-violet-200",
      },
    ].filter(({ fraction }) => fraction > 0);
  }, [totalEvents, recurringEvents]);

  return (
    <ProgramOverviewBlock
      title="Sales by type"
      viewAllHref={`/${workspaceSlug}/program/analytics${getQueryString(
        { tab: "sales" },
        {
          include: ["interval", "start", "end"],
        },
      )}`}
      className="pb-0"
      contentClassName="px-0 mt-1"
    >
      <div className="h-full min-h-48">
        {isLoading ? (
          <div className="flex size-full items-center justify-center py-4">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <div className="text-content-subtle flex size-full items-center justify-center py-4 text-xs">
            Failed to load data
          </div>
        ) : (
          <div className="flex size-full flex-col gap-6 px-6 pb-6">
            <span className="text-content-emphasis block text-xl font-medium">
              {nFormatter(totalEvents?.sales, {
                full: totalEvents?.sales < 99999,
              })}
            </span>
            <div className="flex grow flex-col justify-end gap-9">
              {/* Bars */}
              <div className="flex h-20 gap-4">
                {items.map((item) => (
                  <div
                    key={item.label}
                    className={cn(
                      "h-full rounded-md bg-current transition-transform",
                      hoveredItem === item.label && "scale-105",
                      item.colorClassName,
                    )}
                    style={{ width: `${Math.max(item.fraction * 100, 1)}%` }}
                    onPointerEnter={() => setHoveredItem(item.label)}
                    onPointerLeave={() =>
                      setHoveredItem((i) => (i === item.label ? null : i))
                    }
                  />
                ))}
              </div>

              {/* List */}
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,max-content)_minmax(0,max-content)] items-center gap-x-4 gap-y-2">
                {items.map((item) => (
                  <div
                    key={item.label}
                    className={cn(
                      "text-content-default contents text-xs font-medium tabular-nums transition-colors [&>*]:transition-opacity",
                      item.label === hoveredItem && "text-content-emphasis",
                      hoveredItem &&
                        item.label !== hoveredItem &&
                        "[&>*]:opacity-60",
                    )}
                    onPointerEnter={() => setHoveredItem(item.label)}
                    onPointerLeave={() =>
                      setHoveredItem((i) => (i === item.label ? null : i))
                    }
                  >
                    <div className="flex items-center gap-2 py-1">
                      <div
                        className={cn(
                          "h-5 w-1 rounded-full bg-current",
                          item.colorClassName,
                        )}
                      />
                      <span>{item.label}</span>
                    </div>
                    <span>{formatPercentage(item.fraction * 100)}%</span>
                    <span className="text-content-muted">
                      {nFormatter(item.count, { full: item.count < 99999 })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </ProgramOverviewBlock>
  );
}

const formatPercentage = (value: number) => {
  return value > 0 && value < 0.01
    ? "< 0.01"
    : nFormatter(value, { digits: 2 });
};
