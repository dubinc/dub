import { AnalyticsSaleUnit, EventType } from "@/lib/analytics/types";
import { ChartLine, Filter2, ToggleGroup, useRouterStuff } from "@dub/ui";
import { cn } from "@dub/utils";
import NumberFlow, { NumberFlowGroup } from "@number-flow/react";
import { ChevronRight, Lock } from "lucide-react";
import Link from "next/link";
import { useContext, useMemo } from "react";
import AnalyticsAreaChart from "./analytics-area-chart";
import { AnalyticsFunnelChart } from "./analytics-funnel-chart";
import { AnalyticsContext } from "./analytics-provider";

type Tab = {
  id: EventType;
  label: string;
  colorClassName: string;
};

export default function Main() {
  const {
    totalEvents,
    requiresUpgrade,
    showConversions,
    selectedTab,
    saleUnit,
    view,
  } = useContext(AnalyticsContext);
  const { queryParams } = useRouterStuff();

  const tabs = useMemo(
    () =>
      [
        {
          id: "clicks",
          label: "Clicks",
          colorClassName: "text-blue-500/50",
        },
        ...(showConversions
          ? [
              {
                id: "leads",
                label: "Leads",
                colorClassName: "text-violet-600/50",
              },
              {
                id: "sales",
                label: "Sales",
                colorClassName: "text-teal-400/50",
              },
            ]
          : []),
      ] as Tab[],
    [showConversions],
  );

  const tab = tabs.find(({ id }) => id === selectedTab) ?? tabs[0];

  return (
    <div className="w-full overflow-hidden border border-gray-200 bg-white sm:rounded-xl">
      <div className="scrollbar-hide grid w-full grid-cols-3 divide-x overflow-y-hidden border-b border-gray-200">
        <NumberFlowGroup>
          {tabs.map(({ id, label, colorClassName }, idx) => {
            return (
              <div key={id} className="relative z-0">
                {idx > 0 && (
                  <div className="absolute left-0 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gray-200 bg-white p-1.5">
                    <ChevronRight
                      className="h-3 w-3 text-gray-400"
                      strokeWidth={2.5}
                    />
                  </div>
                )}
                {id === "sales" && (
                  <ToggleGroup
                    className="absolute right-3 top-3 flex w-fit shrink-0 items-center gap-1 border-neutral-100 bg-neutral-100"
                    optionClassName="size-8 p-0 flex items-center justify-center"
                    indicatorClassName="border border-neutral-200 bg-white"
                    options={[
                      {
                        label: <div className="text-base">$</div>,
                        value: "saleAmount",
                      },
                      {
                        label: <div className="text-[11px]">123</div>,
                        value: "sales",
                      },
                    ]}
                    selected={saleUnit}
                    selectAction={(option: AnalyticsSaleUnit) => {
                      queryParams({
                        set: { saleUnit: option },
                      });
                    }}
                  />
                )}
                <Link
                  className={cn(
                    "border-box relative block h-full min-w-[110px] flex-none px-4 py-3 sm:min-w-[240px] sm:px-8 sm:py-6",
                    "transition-colors hover:bg-gray-50 focus:outline-none active:bg-gray-100",
                    "ring-inset ring-gray-500 focus-visible:ring-1 sm:first:rounded-tl-xl",
                  )}
                  href={
                    queryParams({
                      set: {
                        event: id,
                      },
                      getNewPath: true,
                    }) as string
                  }
                  aria-current
                >
                  {/* Active tab indicator */}
                  <div
                    className={cn(
                      "absolute bottom-0 left-0 h-0.5 w-full bg-black transition-transform duration-100",
                      tab.id !== id && "translate-y-[3px]", // Translate an extra pixel to avoid sub-pixel issues
                    )}
                  />

                  <div className="flex items-center gap-2.5 text-sm text-gray-600">
                    <div
                      className={cn(
                        "h-2 w-2 rounded-sm bg-current shadow-[inset_0_0_0_1px_#00000019]",
                        colorClassName,
                      )}
                    />
                    <span>{label}</span>
                  </div>
                  <div className="mt-1 flex h-12 items-center">
                    {totalEvents?.[id] || totalEvents?.[id] === 0 ? (
                      <NumberFlow
                        value={
                          id === "sales" && saleUnit === "saleAmount"
                            ? totalEvents.saleAmount / 100
                            : totalEvents[id]
                        }
                        className="text-2xl font-medium sm:text-3xl"
                        format={
                          id === "sales" && saleUnit === "saleAmount"
                            ? {
                                style: "currency",
                                currency: "USD",
                                // @ts-ignore – this is a valid option but TS is outdated
                                trailingZeroDisplay: "stripIfInteger",
                              }
                            : {
                                notation:
                                  totalEvents[id] > 999999
                                    ? "compact"
                                    : "standard",
                              }
                        }
                      />
                    ) : requiresUpgrade ? (
                      <div className="block rounded-full bg-gray-100 p-2.5">
                        <Lock className="h-4 w-4 text-gray-500" />
                      </div>
                    ) : (
                      <div className="h-9 w-16 animate-pulse rounded-md bg-gray-200" />
                    )}
                  </div>
                </Link>
              </div>
            );
          })}
        </NumberFlowGroup>
      </div>
      <div className="relative">
        {view === "timeseries" && (
          <div className="p-5 pt-10 sm:p-10">
            <AnalyticsAreaChart resource={tab.id} />
          </div>
        )}
        {view === "funnel" && <AnalyticsFunnelChart />}
        {showConversions && (
          <ToggleGroup
            className="absolute right-3 top-3 flex w-fit shrink-0 items-center gap-1 border-neutral-100 bg-neutral-100"
            optionClassName="size-8 p-0 flex items-center justify-center"
            indicatorClassName="border border-neutral-200 bg-white"
            options={[
              {
                label: <ChartLine className="size-4 text-neutral-600" />,
                value: "timeseries",
              },
              {
                label: (
                  <Filter2 className="size-4 -rotate-90 text-neutral-600" />
                ),
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
        )}
      </div>
    </div>
  );
}
