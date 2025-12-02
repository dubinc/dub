import { AnalyticsResponseOptions } from "@/lib/analytics/types";
import { editQueryString } from "@/lib/analytics/utils";
import useWorkspace from "@/lib/swr/use-workspace";
import { AnalyticsContext } from "@/ui/analytics/analytics-provider";
import { LoadingSpinner, useRouterStuff } from "@dub/ui";
import { cn, fetcher, nFormatter } from "@dub/utils";
import Link from "next/link";
import { useContext, useMemo, useState } from "react";
import useSWR from "swr";
import { ProgramOverviewBlock } from "../program-overview-block";

export function SaleTypeBlock() {
  const { slug: workspaceSlug, exceededClicks } = useWorkspace();
  const { getQueryString } = useRouterStuff();
  const {
    queryString,
    totalEvents: newEvents,
    totalEventsLoading: isLoadingNewEvents,
  } = useContext(AnalyticsContext);

  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const {
    data: recurringEvents,
    isLoading: isLoadingRecurring,
    error,
  } = useSWR<{
    [key in AnalyticsResponseOptions]: number;
  }>(
    !exceededClicks &&
      `/api/analytics?${editQueryString(queryString, {
        event: "sales",
        saleType: "recurring",
      })}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  const isLoading = isLoadingRecurring || isLoadingNewEvents;

  const items = useMemo(() => {
    if (!newEvents || !recurringEvents) return [];

    return [
      {
        key: "new",
        label: "New",
        count: newEvents.sales,
        fraction: newEvents.sales / (newEvents.sales + recurringEvents.sales),
        colorClassName: "bg-violet-500",
      },
      {
        key: "recurring",
        label: "Recurring",
        count: recurringEvents.sales,
        fraction:
          recurringEvents.sales / (newEvents.sales + recurringEvents.sales),
        colorClassName: "bg-violet-100",
      },
    ].filter(({ fraction }) => fraction > 0);
  }, [newEvents, recurringEvents]);

  const totalEvents = useMemo(() => {
    if (!newEvents || !recurringEvents) return 0;
    return newEvents.sales + recurringEvents.sales;
  }, [newEvents, recurringEvents]);

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
      <div className="divide-border-subtle @2xl:h-72 flex h-auto flex-col divide-y">
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
              {nFormatter(totalEvents, {
                full: totalEvents < 99999,
              })}
            </span>
            <div className="mt-8 grid gap-4">
              {/* Bars */}
              <div className="flex h-20 gap-4">
                {items.map((item) => (
                  <Link
                    key={item.key}
                    href={`/${workspaceSlug}/program/analytics${getQueryString(
                      { tab: "sales", saleType: item.key },
                      {
                        include: ["interval", "start", "end"],
                      },
                    )}`}
                    aria-label={`${item.label} sales: ${item.count} (${formatPercentage(item.fraction * 100)}%)`}
                    title={`${item.label}: ${nFormatter(item.count)} sales (${formatPercentage(item.fraction * 100)}%)`}
                    className={cn(
                      "h-full rounded-md transition-transform",
                      hoveredItem === item.key && "scale-105",
                      item.colorClassName,
                    )}
                    style={{
                      width: `${Math.max(item.fraction * 100, 2)}%`,
                      minWidth: item.fraction < 0.02 ? "8px" : "auto",
                    }}
                    onPointerEnter={() => setHoveredItem(item.key)}
                    onPointerLeave={() =>
                      setHoveredItem((i) => (i === item.key ? null : i))
                    }
                  />
                ))}
              </div>

              {/* List */}
              <div className="-mx-2 flex flex-col gap-y-2">
                {items.map((item) => (
                  <Link
                    key={item.key}
                    href={`/${workspaceSlug}/program/analytics${getQueryString(
                      { tab: "sales", saleType: item.key },
                      {
                        include: ["interval", "start", "end"],
                      },
                    )}`}
                    className={cn(
                      "text-content-default flex items-center justify-between gap-4 text-xs font-medium tabular-nums transition-[colors,opacity]",
                      "rounded-md px-2 hover:bg-neutral-50 active:bg-neutral-100",
                      item.key === hoveredItem && "text-content-emphasis",
                      hoveredItem && item.key !== hoveredItem && "opacity-60",
                    )}
                    onPointerEnter={() => setHoveredItem(item.key)}
                    onPointerLeave={() =>
                      setHoveredItem((i) => (i === item.key ? null : i))
                    }
                  >
                    <div className="flex items-center gap-2 py-1">
                      <div
                        className={cn(
                          "h-5 w-1 rounded-full",
                          item.colorClassName,
                        )}
                      />
                      <span>{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>{formatPercentage(item.fraction * 100)}%</span>
                      <span className="text-content-muted min-w-8 text-right">
                        {nFormatter(item.count, { full: item.count < 99999 })}
                      </span>
                    </div>
                  </Link>
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
