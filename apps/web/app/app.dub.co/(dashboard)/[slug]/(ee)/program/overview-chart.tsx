import { editQueryString } from "@/lib/analytics/utils";
import useWorkspace from "@/lib/swr/use-workspace";
import { AnalyticsContext } from "@/ui/analytics/analytics-provider";
import { ButtonLink } from "@/ui/placeholders/button-link";
import { Combobox, LoadingSpinner, useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import NumberFlow from "@number-flow/react";
import { useContext, useMemo } from "react";
import useSWR from "swr";
import { AnalyticsTimeseriesChart } from "./analytics/analytics-timeseries-chart";

const chartOptions = [
  { value: "sales", label: "Revenue", currency: true },
  { value: "leads", label: "Leads" },
  { value: "clicks", label: "Clicks" },
];

export function OverviewChart() {
  const { queryParams } = useRouterStuff();
  const { selectedTab, saleUnit, queryString, totalEvents } =
    useContext(AnalyticsContext);

  const { slug } = useWorkspace();

  const { data, error, isLoading } = useSWR<
    {
      start: Date;
      clicks: number;
      leads: number;
      sales: number;
      saleAmount: number;
    }[]
  >(
    `/api/analytics?${editQueryString(queryString, {
      event: "composite",
      groupBy: "timeseries",
    })}`,
    fetcher,
  );

  const chartData = useMemo(
    () =>
      data?.map((d) => ({
        date: new Date(d.start),
        values: {
          amount:
            selectedTab === "sales" && saleUnit === "saleAmount"
              ? d.saleAmount / 100
              : d[selectedTab],
        },
      })),
    [data, selectedTab, saleUnit],
  );

  return (
    <div className="flex size-full flex-col gap-6">
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <Combobox
            selected={
              chartOptions.find((opt) => opt.value === selectedTab) || null
            }
            setSelected={(option) =>
              option && queryParams({ set: { event: option.value } })
            }
            options={chartOptions.slice()}
            optionClassName="w-36"
            caret={true}
            hideSearch={true}
            buttonProps={{
              variant: "outline",
              className: "h-7 w-fit px-2 -ml-2 -mt-1.5",
            }}
          />
          {totalEvents ? (
            <NumberFlow
              value={
                selectedTab === "sales" && saleUnit === "saleAmount"
                  ? totalEvents.saleAmount / 100
                  : totalEvents[selectedTab]
              }
              className="text-content-emphasis block text-3xl font-medium"
              format={
                selectedTab === "sales" && saleUnit === "saleAmount"
                  ? {
                      style: "currency",
                      currency: "USD",
                      trailingZeroDisplay: "stripIfInteger",
                    }
                  : {
                      notation:
                        totalEvents[selectedTab] > 999999
                          ? "compact"
                          : "standard",
                    }
              }
            />
          ) : (
            <div className="mb-1 mt-px h-10 w-24 animate-pulse rounded-md bg-neutral-200" />
          )}
        </div>

        <ButtonLink
          href={`/${slug}/program/analytics`}
          variant="secondary"
          className="h-8 px-3 text-sm"
        >
          View all
        </ButtonLink>
      </div>

      <div className="relative min-h-0 grow">
        {isLoading ? (
          <div className="flex size-full items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <div className="text-content-subtle flex size-full items-center justify-center text-sm">
            Failed to load data
          </div>
        ) : (
          <AnalyticsTimeseriesChart data={chartData} />
        )}
      </div>
    </div>
  );
}
