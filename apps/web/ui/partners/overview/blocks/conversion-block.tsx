import { AnalyticsResponseOptions } from "@/lib/analytics/types";
import { editQueryString } from "@/lib/analytics/utils";
import useWorkspace from "@/lib/swr/use-workspace";
import { AnalyticsContext } from "@/ui/analytics/analytics-provider";
import { LoadingSpinner, useRouterStuff } from "@dub/ui";
import { FunnelChart } from "@dub/ui/charts";
import { fetcher, nFormatter } from "@dub/utils";
import { useContext, useMemo } from "react";
import useSWR from "swr";
import { ProgramOverviewBlock } from "../program-overview-block";

export function ConversionBlock() {
  const { slug: workspaceSlug } = useWorkspace();

  const { getQueryString } = useRouterStuff();

  const { queryString } = useContext(AnalyticsContext);

  const {
    data: totalEvents,
    isLoading,
    error,
  } = useSWR<{
    [key in AnalyticsResponseOptions]: number;
  }>(
    `/api/analytics?${editQueryString(queryString, {
      event: "composite",
    })}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  const steps = useMemo(
    () => [
      {
        id: "clicks",
        label: "Click",
        value: totalEvents?.clicks ?? 0,
        colorClassName: "text-blue-600",
      },
      {
        id: "leads",
        label: "Lead",
        value: totalEvents?.leads ?? 0,
        colorClassName: "text-violet-600",
      },
      {
        id: "sales",
        label: "Sale",
        value: totalEvents?.sales ?? 0,
        additionalValue: totalEvents?.saleAmount ?? 0,
        colorClassName: "text-teal-400",
      },
    ],
    [totalEvents],
  );

  const maxValue = useMemo(
    () => Math.max(...steps.map((step) => step.value)),
    [steps],
  );

  return (
    <ProgramOverviewBlock
      title="Conversion rate"
      viewAllHref={`/${workspaceSlug}/program/analytics${getQueryString(
        { view: "funnel" },
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
          <div className="flex size-full flex-col">
            <div className="px-6">
              <span className="text-content-emphasis block text-xl font-medium">
                {formatPercentage((steps.at(-1)!.value / maxValue) * 100) + "%"}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-3">
              {steps.map((step) => (
                <div
                  key={step.id}
                  className="flex flex-col px-6 text-xs font-medium"
                >
                  <div className="text-content-muted">{step.label}</div>
                  <span className="text-content-emphasis">
                    {formatPercentage((step.value / maxValue) * 100) + "%"}
                  </span>
                </div>
              ))}
            </div>
            <div className="grow [mask-image:linear-gradient(transparent,black_30%)]">
              <FunnelChart
                steps={steps}
                persistentPercentages={false}
                tooltips={false}
                chartPadding={20}
              />
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
