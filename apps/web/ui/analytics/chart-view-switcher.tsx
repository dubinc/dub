import { ChartLine, Filter2, ToggleGroup, useRouterStuff } from "@dub/ui";
import { cn } from "@dub/utils";
import { useContext } from "react";
import { AnalyticsContext } from "./analytics-provider";

export function ChartViewSwitcher({ className }: { className?: string }) {
  const { queryParams } = useRouterStuff();

  const { view } = useContext(AnalyticsContext);

  return (
    <ToggleGroup
      className={cn(
        "flex w-fit shrink-0 items-center gap-1 border-neutral-100 bg-neutral-100",
        className,
      )}
      optionClassName="size-8 p-0 flex items-center justify-center"
      indicatorClassName="border border-neutral-200 bg-white"
      options={[
        {
          label: <ChartLine className="size-4 text-neutral-600" />,
          value: "timeseries",
        },
        {
          label: <Filter2 className="size-4 -rotate-90 text-neutral-600" />,
          value: "funnel",
        },
      ]}
      selected={view}
      selectAction={(option) => {
        queryParams({
          set: { view: option },
        });
      }}
    />
  );
}
