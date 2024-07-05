import useWorkspace from "@/lib/swr/use-workspace";
import { CountingNumbers, NumberTooltip, useRouterStuff } from "@dub/ui";
import { cn } from "@dub/utils";
import { ChevronRight, Lock } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useContext, useMemo } from "react";
import AnalyticsAreaChart from "./analytics-area-chart";
import { AnalyticsContext } from "./analytics-provider";

type Tab = {
  id: string;
  label: string;
  colorClassName: string;
  show: ("clicks" | "leads" | "sales")[];
};

export default function Main() {
  const { betaTester } = useWorkspace();
  const { totalEvents, requiresUpgrade, demoPage, selectedTab } =
    useContext(AnalyticsContext);
  const searchParams = useSearchParams();
  const { queryParams } = useRouterStuff();

  // Root domain related
  const root = searchParams.get("root");

  const tabs = useMemo(
    () =>
      [
        {
          id: "clicks",
          label: "Clicks",
          colorClassName: "text-blue-500/50",
          show: ["clicks"],
        },
        ...(betaTester || demoPage
          ? [
              {
                id: "leads",
                label: "Leads",
                colorClassName: "text-violet-600/50",
                show: ["leads"],
              },
              {
                id: "sales",
                label: "Sales",
                colorClassName: "text-teal-400/50",
                show: ["sales"],
              },
            ]
          : []),
      ] as Tab[],
    [betaTester],
  );

  const tab = tabs.find(({ id }) => id === selectedTab) || {
    id: "composite",
    show: ["clicks", "leads", "sales"],
  };

  return (
    <div className="w-full overflow-hidden border border-gray-200 bg-white sm:rounded-xl">
      <div className="scrollbar-hide mb-5 flex w-full divide-x overflow-y-hidden overflow-x-scroll border-b border-gray-200">
        {tabs.map(({ id, label, colorClassName }, idx) => {
          const total = {
            clicks: totalEvents?.clicks,
            leads: totalEvents?.leads,
            sales: totalEvents ? totalEvents.amount / 100 : undefined,
          }[id];

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
              <Link
                className={cn(
                  "border-box relative block h-full min-w-[110px] flex-none px-4 py-3 sm:min-w-[240px] sm:px-8 sm:py-6",
                  "transition-colors hover:bg-gray-50 focus:outline-none active:bg-gray-100",
                  "ring-inset ring-gray-500 focus-visible:ring-1 sm:first:rounded-tl-xl",
                )}
                href={
                  (tab.id === id
                    ? queryParams({
                        del: "tab",
                        getNewPath: true,
                      })
                    : queryParams({
                        set: {
                          tab: id,
                        },
                        getNewPath: true,
                      })) as string
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
                <div className="mt-1 flex">
                  {total || total === 0 ? (
                    <NumberTooltip
                      value={id === "sales" ? totalEvents?.sales : total}
                      unit={label.toLowerCase()}
                    >
                      <CountingNumbers
                        as="h1"
                        className="text-2xl font-medium sm:text-3xl"
                        prefix={id === "sales" && "$"}
                        {...(id === "sales" && { fullNumber: true })}
                      >
                        {total}
                      </CountingNumbers>
                    </NumberTooltip>
                  ) : requiresUpgrade ? (
                    <div className="block rounded-full bg-gray-100 p-2.5">
                      <Lock className="h-4 w-4 text-gray-500" />
                    </div>
                  ) : (
                    <div className="h-8 w-12 animate-pulse rounded-md bg-gray-200 sm:h-9" />
                  )}
                </div>
              </Link>
            </div>
          );
        })}
      </div>
      <div className="p-5 sm:p-10">
        <AnalyticsAreaChart show={tab.show} />
      </div>
    </div>
  );
}
