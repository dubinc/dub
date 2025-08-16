import { EventType } from "@/lib/analytics/types";
import useWorkspace from "@/lib/swr/use-workspace";
import { BlurImage, buttonVariants, useRouterStuff } from "@dub/ui";
import { cn } from "@dub/utils";
import { Play } from "lucide-react";
import Link from "next/link";
import { useContext, useMemo } from "react";
import AnalyticsAreaChart from "./analytics-area-chart";
import { AnalyticsFunnelChart } from "./analytics-funnel-chart";
import { AnalyticsContext } from "./analytics-provider";
import { AnalyticsTabs } from "./analytics-tabs";
import { ChartViewSwitcher } from "./chart-view-switcher";

type Tab = {
  id: EventType;
  label: string;
  colorClassName: string;
  conversions: boolean;
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
  const { plan } = useWorkspace();
  const { queryParams } = useRouterStuff();

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

  const tab = tabs.find(({ id }) => id === selectedTab) ?? tabs[0];

  const showPaywall =
    (tab.conversions || view === "funnel") &&
    (plan === "free" || plan === "pro");

  return (
    <div className="w-full overflow-hidden bg-white">
      <div className="border border-neutral-200 sm:rounded-t-xl">
        <AnalyticsTabs
          showConversions={showConversions}
          totalEvents={totalEvents}
          tab={selectedTab}
          tabHref={(id) =>
            queryParams({
              set: {
                event: id,
              },
              getNewPath: true,
            }) as string
          }
          saleUnit={saleUnit}
          setSaleUnit={(option) =>
            queryParams({
              set: { saleUnit: option },
            })
          }
          requiresUpgrade={requiresUpgrade}
          showPaywall={showPaywall}
        />
      </div>
      <div className="relative">
        <div
          className={cn(
            "relative overflow-hidden border-x border-b border-neutral-200 sm:rounded-b-xl",
            showPaywall &&
              "pointer-events-none [mask-image:linear-gradient(#0006,#0006_25%,transparent_40%)]",
          )}
        >
          {view === "timeseries" && (
            <div className="p-5 pt-10 sm:p-10">
              <AnalyticsAreaChart resource={tab.id} demo={showPaywall} />
            </div>
          )}
          {view === "funnel" && (
            <div className="h-[444px] w-full sm:h-[464px]">
              <AnalyticsFunnelChart demo={showPaywall} />
            </div>
          )}
        </div>
        <ChartViewSwitcher className="absolute right-3 top-3" />
        {showPaywall && <ConversionTrackingPaywall />}
      </div>
    </div>
  );
}

function ConversionTrackingPaywall() {
  const { slug } = useWorkspace();

  return (
    <div className="animate-slide-up-fade pointer-events-none absolute inset-0 flex items-center justify-center pt-24">
      <div className="pointer-events-auto flex flex-col items-center">
        <Link
          href="https://d.to/conversions"
          target="_blank"
          className="group relative flex aspect-video w-full max-w-80 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100"
        >
          <BlurImage
            src="https://assets.dub.co/blog/conversion-analytics.png"
            alt="thumbnail"
            fill
            className="object-cover"
          />
          <div className="relative flex size-10 items-center justify-center rounded-full bg-neutral-900 ring-[6px] ring-black/5 transition-all duration-75 group-hover:ring-[8px] group-active:ring-[7px]">
            <Play className="size-4 fill-current text-white" />
          </div>
        </Link>
        <h2 className="mt-7 text-base font-semibold text-neutral-700">
          Conversion Tracking
        </h2>
        <p className="mt-4 max-w-sm text-center text-sm text-neutral-500">
          Want to see how your clicks are converting to revenue? Upgrade to our
          Business Plan and start tracking conversion events with Dub.{" "}
          <Link
            href="https://d.to/conversions"
            target="_blank"
            className="underline transition-colors duration-75 hover:text-neutral-700"
          >
            Learn more
          </Link>
        </p>
        <Link
          href={`/${slug}/upgrade`}
          className={cn(
            buttonVariants({ variant: "primary" }),
            "mt-4 flex h-8 items-center justify-center whitespace-nowrap rounded-lg border px-3 text-sm",
          )}
        >
          Upgrade to Business
        </Link>
      </div>
    </div>
  );
}
