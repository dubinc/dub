import {
  AnalyticsResponseOptions,
  AnalyticsSaleUnit,
  EventType,
} from "@/lib/analytics/types";
import { ToggleGroup } from "@dub/ui";
import { cn } from "@dub/utils";
import NumberFlow, { NumberFlowGroup } from "@number-flow/react";
import { ChevronRight, Lock } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

type Tab = {
  id: EventType;
  label: string;
  colorClassName: string;
  conversions: boolean;
};

export function AnalyticsTabs({
  showConversions,
  totalEvents,
  tab,
  tabHref,
  saleUnit,
  setSaleUnit,
  requiresUpgrade,
  showPaywall,
}: {
  showConversions?: boolean;
  totalEvents?: { [key in AnalyticsResponseOptions]: number };
  tab: Tab["id"];
  tabHref: (id: Tab["id"]) => string;
  saleUnit: AnalyticsSaleUnit;
  setSaleUnit: (saleUnit: AnalyticsSaleUnit) => void;
  requiresUpgrade?: boolean;
  showPaywall?: boolean;
}) {
  const tabs = useMemo(
    () =>
      [
        {
          id: "clicks",
          label: "Clicks",
          colorClassName: "text-blue-500/50",
          conversions: false,
        },
        ...(showConversions
          ? [
              {
                id: "leads",
                label: "Leads",
                colorClassName: "text-violet-600/50",
                conversions: true,
              },
              {
                id: "sales",
                label: "Sales",
                colorClassName: "text-teal-400/50",
                conversions: true,
              },
            ]
          : []),
      ] as Tab[],
    [showConversions],
  );

  return (
    <div className="grid w-full grid-cols-3 divide-x divide-neutral-200 overflow-y-hidden">
      <NumberFlowGroup>
        {tabs.map(({ id, label, colorClassName }, idx) => {
          return (
            <div key={id} className="relative z-0">
              {idx > 0 && (
                <div className="absolute left-0 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-neutral-200 bg-white p-1.5">
                  <ChevronRight
                    className="h-3 w-3 text-neutral-400"
                    strokeWidth={2.5}
                  />
                </div>
              )}
              <Link
                className={cn(
                  "border-box relative block h-full min-w-[110px] flex-none px-4 py-3 sm:min-w-[240px] sm:px-8 sm:py-6",
                  "transition-colors hover:bg-neutral-50 focus:outline-none active:bg-neutral-100",
                  "ring-inset ring-neutral-500 focus-visible:ring-1 sm:first:rounded-tl-xl",
                )}
                href={tabHref(id)}
                aria-current
              >
                {/* Active tab indicator */}
                <div
                  className={cn(
                    "absolute bottom-0 left-0 h-0.5 w-full bg-black transition-transform duration-100",
                    tab !== id && "translate-y-[3px]", // Translate an extra pixel to avoid sub-pixel issues
                  )}
                />

                <div className="flex items-center gap-2.5 text-sm text-neutral-600">
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
                      className={cn(
                        "text-xl font-medium sm:text-3xl",
                        showPaywall && "opacity-30",
                      )}
                      format={
                        id === "sales" && saleUnit === "saleAmount"
                          ? {
                              style: "currency",
                              currency: "USD",
                              // @ts-ignore – trailingZeroDisplay is a valid option but TS is outdated
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
                    <div className="block rounded-full bg-neutral-100 p-2.5">
                      <Lock className="h-4 w-4 text-neutral-500" />
                    </div>
                  ) : (
                    <div className="h-9 w-16 animate-pulse rounded-md bg-neutral-200" />
                  )}
                </div>
              </Link>
              {id === "sales" && (
                <ToggleGroup
                  className="absolute right-3 top-3 hidden w-fit shrink-0 items-center gap-1 border-neutral-100 bg-neutral-100 sm:flex"
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
                  selectAction={setSaleUnit}
                />
              )}
            </div>
          );
        })}
      </NumberFlowGroup>
    </div>
  );
}
