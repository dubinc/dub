import { FunnelChart } from "@dub/ui/charts";
import { useContext, useMemo } from "react";
import { AnalyticsLoadingSpinner } from "./analytics-loading-spinner";
import { AnalyticsContext } from "./analytics-provider";

export function AnalyticsFunnelChart() {
  const { totalEvents } = useContext(AnalyticsContext);

  const steps = useMemo(
    () => [
      {
        id: "clicks",
        label: "Clicks",
        value: totalEvents?.clicks ?? 0,
        colorClassName: "text-blue-600",
      },
      {
        id: "leads",
        label: "Leads",
        value: totalEvents?.leads ?? 0,
        colorClassName: "text-violet-600",
      },
      {
        id: "sales",
        label: "Sales",
        value: totalEvents?.sales ?? 0,
        additionalValue: totalEvents?.saleAmount ?? 0,
        colorClassName: "text-teal-400",
      },
    ],
    [totalEvents],
  );

  return (
    <div className="h-[444px] w-full sm:h-[464px]">
      {totalEvents ? (
        <FunnelChart steps={steps} defaultTooltipStepId="clicks" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <AnalyticsLoadingSpinner />
        </div>
      )}
    </div>
  );
}
