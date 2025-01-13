import { FunnelChart } from "@dub/ui/charts";
import { useContext, useMemo } from "react";
import { AnalyticsLoadingSpinner } from "./analytics-loading-spinner";
import { AnalyticsContext } from "./analytics-provider";

export function AnalyticsFunnelChart({ demo }: { demo?: boolean }) {
  const { totalEvents } = useContext(AnalyticsContext);

  const steps = useMemo(
    () => [
      {
        id: "clicks",
        label: "Clicks",
        value: demo ? 130 : totalEvents?.clicks ?? 0,
        colorClassName: "text-blue-600",
      },
      {
        id: "leads",
        label: "Leads",
        value: demo ? 100 : totalEvents?.leads ?? 0,
        colorClassName: "text-violet-600",
      },
      {
        id: "sales",
        label: "Sales",
        value: demo ? 24 : totalEvents?.sales ?? 0,
        additionalValue: demo ? 228_00 : totalEvents?.saleAmount ?? 0,
        colorClassName: "text-teal-400",
      },
    ],
    [demo, totalEvents],
  );

  return (
    <div className="h-[444px] w-full sm:h-[464px]">
      {totalEvents || demo ? (
        <FunnelChart
          steps={steps}
          defaultTooltipStepId={demo ? "sales" : undefined}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <AnalyticsLoadingSpinner />
        </div>
      )}
    </div>
  );
}
