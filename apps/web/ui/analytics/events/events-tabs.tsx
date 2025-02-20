import { AnalyticsResponseOptions } from "@/lib/analytics/types";
import { editQueryString } from "@/lib/analytics/utils";
import { MiniAreaChart, useMediaQuery, useRouterStuff } from "@dub/ui";
import { capitalize, cn, fetcher } from "@dub/utils";
import NumberFlow from "@number-flow/react";
import { useCallback, useContext, useEffect } from "react";
import useSWR from "swr";
import useSWRImmutable from "swr/immutable";
import { AnalyticsContext } from "../analytics-provider";

type TimeseriesData = {
  start: Date;
  clicks: number;
  leads: number;
  sales: number;
  saleAmount: number;
}[];

export default function EventsTabs() {
  const { searchParams, queryParams } = useRouterStuff();
  const { isMobile } = useMediaQuery();

  const tab = searchParams.get("event") || "clicks";

  const { baseApiPath, queryString, requiresUpgrade } =
    useContext(AnalyticsContext);

  const { data: totalEvents, isLoading: isLoadingTotalEvents } = useSWR<{
    [key in AnalyticsResponseOptions]: number;
  }>(
    `${baseApiPath}?${editQueryString(queryString, {
      event: "composite",
    })}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  const { data: timeseriesData, isLoading: isLoadingTimeseries } =
    useSWRImmutable<TimeseriesData>(
      `${baseApiPath}?${editQueryString(queryString, {
        groupBy: "timeseries",
        event: "composite",
      })}`,
      fetcher,
      {
        shouldRetryOnError: !requiresUpgrade,
        keepPreviousData: true,
      },
    );

  const onEventTabClick = useCallback(
    (event: string) => {
      const sortOptions =
        event === "sales" ? ["timestamp", "saleAmount"] : ["date"];
      const currentSort = searchParams.get("sort");
      queryParams({
        set: { event },
        del: [
          // Reset pagination
          "page",
          // Reset sort if not possible
          ...(currentSort && !sortOptions.includes(currentSort)
            ? ["sort"]
            : []),
        ],
      });
    },
    [queryParams, searchParams.get("sort")],
  );

  useEffect(() => {
    const sortBy = searchParams.get("sort");
    if (tab !== "sales" && sortBy !== "timestamp") queryParams({ del: "sort" });
  }, [tab, searchParams.get("sort")]);

  return (
    <div className="grid w-full grid-cols-3 gap-2 overflow-x-auto sm:gap-4">
      {["clicks", "leads", "sales"].map((event) => (
        <button
          key={event}
          className={cn(
            "flex justify-between gap-4 rounded-xl border bg-white px-5 py-4 text-left transition-[box-shadow] focus:outline-none",
            tab === event
              ? "border-black shadow-[0_0_0_1px_black_inset]"
              : "border-neutral-200 focus-visible:border-black",
          )}
          onClick={() => onEventTabClick(event)}
        >
          <div>
            <p className="text-sm text-neutral-600">{capitalize(event)}</p>
            <div className="mt-2">
              {totalEvents ? (
                <NumberFlow
                  value={
                    event === "sales"
                      ? totalEvents?.saleAmount / 100
                      : totalEvents?.[event]
                  }
                  className={cn(
                    "text-2xl transition-opacity",
                    isLoadingTotalEvents && "opacity-40",
                  )}
                  format={
                    event === "sales"
                      ? {
                          style: "currency",
                          currency: "USD",
                          // @ts-ignore – trailingZeroDisplay is a valid option but TS is outdated
                          trailingZeroDisplay: "stripIfInteger",
                        }
                      : {
                          notation:
                            totalEvents?.[event] > 999999
                              ? "compact"
                              : "standard",
                        }
                  }
                />
              ) : (
                <div className="h-8 w-12 animate-pulse rounded-md bg-neutral-200" />
              )}
            </div>
          </div>
          {timeseriesData && !isMobile && (
            <div
              className={cn(
                "relative h-full max-w-[140px] grow transition-opacity",
                isLoadingTimeseries && "opacity-40",
              )}
            >
              <MiniAreaChart
                data={
                  timeseriesData?.map((d) => ({
                    date: new Date(d.start),
                    value:
                      ((event === "sales" ? d?.saleAmount : d?.[event]) as
                        | number
                        | undefined) ?? 0,
                  })) || []
                }
              />
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
