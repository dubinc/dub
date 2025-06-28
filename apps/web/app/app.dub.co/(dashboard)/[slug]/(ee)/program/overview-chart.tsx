import { formatDateTooltip } from "@/lib/analytics/format-date-tooltip";
import { IntervalOptions } from "@/lib/analytics/types";
import { editQueryString } from "@/lib/analytics/utils";
import useCommissionsTimeseries from "@/lib/swr/use-commissions-timeseries";
import useWorkspace from "@/lib/swr/use-workspace";
import { AnalyticsContext } from "@/ui/analytics/analytics-provider";
import { ButtonLink } from "@/ui/placeholders/button-link";
import { Combobox, LoadingSpinner, useRouterStuff } from "@dub/ui";
import { Areas, TimeSeriesChart, XAxis, YAxis } from "@dub/ui/charts";
import { currencyFormatter, fetcher } from "@dub/utils";
import NumberFlow from "@number-flow/react";
import { useContext, useMemo, useState } from "react";
import useSWR from "swr";

const chartOptions = [
  { value: "revenue", label: "Revenue" },
  { value: "commissions", label: "Commissions" },
];

type ViewType = "revenue" | "commissions";

export function OverviewChart() {
  const { getQueryString } = useRouterStuff();
  const { queryString, start, end, interval } = useContext(AnalyticsContext);

  const [viewType, setViewType] = useState<ViewType>("revenue");

  const { slug } = useWorkspace();

  const { data: revenue, error: revenueError } = useSWR<
    {
      start: Date;
      clicks: number;
      leads: number;
      sales: number;
      saleAmount: number;
    }[]
  >(
    viewType === "revenue"
      ? `/api/analytics?${editQueryString(queryString, {
          event: "composite",
          groupBy: "timeseries",
        })}`
      : null,
    fetcher,
  );

  const { data: commissions, error: commissionsError } =
    useCommissionsTimeseries({
      event: "sales",
      groupBy: "timeseries",
      interval: interval as IntervalOptions | undefined,
      start: start ? new Date(start) : undefined,
      end: end ? new Date(end) : undefined,
      enabled: viewType === "commissions",
    });

  const data = useMemo(() => {
    const sourceData = viewType === "revenue" ? revenue : commissions;

    return sourceData?.map((item) => ({
      date: new Date(item.start),
      values: {
        amount:
          (viewType === "revenue" ? item.saleAmount : item.earnings) / 100,
      },
    }));
  }, [revenue, commissions, viewType]);

  const total = useMemo(() => {
    return data?.reduce((acc, curr) => acc + curr.values.amount, 0);
  }, [data]);

  const isLoading = !data && !revenueError && !commissionsError;
  const error = revenueError || commissionsError;

  return (
    <div className="flex size-full flex-col gap-6">
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <Combobox
            selected={
              chartOptions.find((opt) => opt.value === viewType) || null
            }
            setSelected={(option) => option && setViewType(option.value)}
            options={chartOptions}
            optionClassName="w-36"
            caret={true}
            hideSearch={true}
            buttonProps={{
              variant: "outline",
              className: "h-7 w-fit px-2 -ml-2 -mt-1.5",
            }}
          />
          {total !== undefined ? (
            <NumberFlow
              value={total}
              className="text-content-emphasis block text-3xl font-medium"
              format={{
                style: "currency",
                currency: "USD",
              }}
            />
          ) : (
            <div className="mb-1 mt-px h-10 w-24 animate-pulse rounded-md bg-neutral-200" />
          )}
        </div>

        <ButtonLink
          href={`/${slug}/program/${viewType === "revenue" ? "analytics" : "commissions"}${getQueryString(
            undefined,
            {
              include: ["interval", "start", "end"],
            },
          )}`}
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
          <TimeSeriesChart
            key={`${start?.toString()}-${end?.toString()}-${interval?.toString()}-${viewType}`}
            data={data || []}
            series={[
              {
                id: "amount",
                valueAccessor: (d) => d.values.amount,
                colorClassName: "text-[#8B5CF6]",
                isActive: true,
              },
            ]}
            tooltipClassName="p-0"
            tooltipContent={(d) => {
              return (
                <>
                  <p className="border-b border-neutral-200 px-4 py-3 text-sm text-neutral-900">
                    {formatDateTooltip(d.date, { interval, start, end })}
                  </p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-sm bg-violet-500 shadow-[inset_0_0_0_1px_#0003]" />
                      <p className="capitalize text-neutral-600">
                        {viewType === "revenue" ? "Revenue" : "Commissions"}
                      </p>
                    </div>
                    <p className="text-right font-medium text-neutral-900">
                      {currencyFormatter(d.values.amount, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </>
              );
            }}
          >
            <XAxis
              tickFormat={(date) =>
                formatDateTooltip(date, { interval, start, end })
              }
            />
            <YAxis showGridLines tickFormat={currencyFormatter} />
            <Areas />
          </TimeSeriesChart>
        )}
      </div>
    </div>
  );
}
