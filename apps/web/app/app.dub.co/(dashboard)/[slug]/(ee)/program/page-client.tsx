"use client";

import { DUB_PARTNERS_ANALYTICS_INTERVAL } from "@/lib/analytics/constants";
import { AnalyticsResponseOptions } from "@/lib/analytics/types";
import { editQueryString } from "@/lib/analytics/utils";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { mutatePrefix } from "@/lib/swr/mutate";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { AnalyticsContext } from "@/ui/analytics/analytics-provider";
import { useAnalyticsConnectedStatus } from "@/ui/analytics/use-analytics-connected-status";
import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { CommissionsBlock } from "@/ui/partners/overview/blocks/commissions-block";
import { ConversionBlock } from "@/ui/partners/overview/blocks/conversion-block";
import { CountriesBlock } from "@/ui/partners/overview/blocks/countries-block";
import { LinksBlock } from "@/ui/partners/overview/blocks/links-block";
import { PartnersBlock } from "@/ui/partners/overview/blocks/partners-block";
import { SaleTypeBlock } from "@/ui/partners/overview/blocks/sale-type-block";
import { TrafficSourcesBlock } from "@/ui/partners/overview/blocks/traffic-sources-block";
import { ProgramOverviewCard } from "@/ui/partners/overview/program-overview-card";
import SimpleDateRangePicker from "@/ui/shared/simple-date-range-picker";
import { Button, Plug2, buttonVariants, useRouterStuff } from "@dub/ui";
import { TriangleWarning } from "@dub/ui/icons";
import { cn, fetcher } from "@dub/utils";
import Link from "next/link";
import { ReactNode, useMemo } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { OverviewChart } from "./overview-chart";
import { OverviewLinks } from "./overview-links";
import { OverviewTasks } from "./overview-tasks";

const BLOCKS = [
  PartnersBlock,
  TrafficSourcesBlock,
  CommissionsBlock,
  ConversionBlock,
  CountriesBlock,
  LinksBlock,
  SaleTypeBlock,
];

export default function ProgramOverviewPageClient() {
  const {
    defaultProgramId,
    id: workspaceId,
    exceededEvents,
    slug,
    plan,
  } = useWorkspace();
  const { program, mutate: mutateProgram } = useProgram();
  const { canManageProgram } = getPlanCapabilities(plan);

  const { searchParamsObj } = useRouterStuff();

  const { start, end, interval } = useMemo(() => {
    const { event, ...rest } = searchParamsObj;
    return {
      interval: DUB_PARTNERS_ANALYTICS_INTERVAL,
      ...rest,
    } as Record<string, any>;
  }, [searchParamsObj]);

  const queryString = new URLSearchParams({
    programId: defaultProgramId ?? "",
    workspaceId: workspaceId ?? "",
    ...(start && end && { start, end }),
    ...(interval && { interval: interval.toString() }),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }).toString();

  const { data: totalEvents, isLoading: totalEventsLoading } = useSWR<{
    [key in AnalyticsResponseOptions]: number;
  }>(
    !exceededEvents &&
      `/api/analytics?${editQueryString(queryString, {
        event: "composite",
        saleType: "new",
      })}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  const { setShowConfirmModal, confirmModal } = useConfirmModal({
    title: "Reactivate program",
    description:
      "This will reactivate your program and all partner links. Partners will be able to promote your program and earn commissions again.",
    confirmText: "Reactivate",
    onConfirm: async () => {
      if (!program?.id || !workspaceId) {
        return;
      }

      await toast.promise(
        (async () => {
          const response = await fetch(
            `/api/programs/${program.id}/reactivate?workspaceId=${workspaceId}`,
            {
              method: "POST",
            },
          );

          if (!response.ok) {
            const { error } = await response.json();
            throw new Error(error.message);
          }

          await Promise.all([mutateProgram(), mutatePrefix("/api/partners")]);
        })(),
        {
          loading: "Reactivating program...",
          success: "Program reactivated successfully!",
          error: (error) => error.message,
        },
      );
    },
  });

  return (
    <div className="@container flex flex-col gap-4">
      {confirmModal}
      {program?.deactivatedAt && (
        <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-start gap-3">
            <TriangleWarning className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <p className="flex-1 text-sm text-amber-900">
              Your partner program is deactivated. Partners can no longer
              promote your program or earn commissions.
              {!canManageProgram && (
                <>
                  {" "}
                  <Link
                    href={`/${slug}/settings/billing/upgrade`}
                    className="font-medium underline underline-offset-2 transition-colors hover:text-neutral-800"
                  >
                    Upgrade your plan
                  </Link>{" "}
                  to reactivate it.
                </>
              )}
            </p>
          </div>
          {canManageProgram ? (
            <Button
              text="Reactivate program"
              variant="secondary"
              className="h-8 w-fit shrink-0 bg-white px-3"
              onClick={() => setShowConfirmModal(true)}
            />
          ) : null}
        </div>
      )}
      <SimpleDateRangePicker align="start" className="w-fit" />
      <AnalyticsContext.Provider
        value={{
          basePath: "",
          baseApiPath: "/api/analytics",
          selectedTab: "sales",
          saleUnit: "saleAmount",
          view: "timeseries",
          queryString,
          start: start ? new Date(start) : undefined,
          end: end ? new Date(end) : undefined,
          interval: interval as string | undefined,
          totalEvents,
          totalEventsLoading,
        }}
      >
        <div className="@4xl:grid-cols-[minmax(0,1fr)_400px] grid grid-cols-1 gap-6 rounded-2xl bg-neutral-100 p-4">
          {/* Chart */}
          <ProgramOverviewCard className="@4xl:h-full h-96 p-6">
            <OverviewChart />
          </ProgramOverviewCard>

          <div className="@4xl:grid-cols-1 @2xl:grid-cols-2 grid grid-cols-1 gap-6">
            {/* Tasks */}
            <OverviewTasks />

            {/* Program links */}
            <OverviewLinks />
          </div>
        </div>
        <FinishSetupWrapper totalEvents={totalEvents}>
          <div className="@2xl:grid-cols-2 @4xl:grid-cols-3 grid grid-cols-1 gap-6">
            {BLOCKS.map((Block, idx) => (
              <Block key={idx} />
            ))}
          </div>
        </FinishSetupWrapper>
      </AnalyticsContext.Provider>
    </div>
  );
}

function FinishSetupWrapper({
  totalEvents,
  children,
}: {
  totalEvents?: {
    clicks: number;
    leads: number;
    sales: number;
  };
  children: ReactNode;
}) {
  const { slug } = useWorkspace();
  const { isFullyConnected } = useAnalyticsConnectedStatus();

  if (
    isFullyConnected ||
    totalEvents === undefined ||
    ["clicks", "leads", "sales"].some((event) => totalEvents[event] > 0)
  )
    return children;

  return (
    <div className="relative">
      <div className="relative h-[28rem] overflow-hidden">{children}</div>
      <div className="from-bg-default to-bg-default/30 absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-t from-60% text-center">
        <div className="flex size-12 items-center justify-center rounded-lg border border-blue-200 bg-blue-100">
          <Plug2 className="size-6 text-blue-500" />
        </div>

        <h2 className="text-content-emphasis mt-6 text-xl font-semibold">
          Finish setting up your program
        </h2>
        <p className="text-content-subtle mt-2 max-w-md text-pretty text-sm">
          Install the Dub tracking script on your site to track conversions,
          attribute sales, and measure partner performance.
        </p>
        <Link
          href={`/${slug}/settings/tracking`}
          className={cn(
            buttonVariants({ variant: "primary" }),
            "mt-6 flex h-9 items-center justify-center whitespace-nowrap rounded-lg border px-3 text-sm",
          )}
        >
          Set up conversion tracking
        </Link>
      </div>
    </div>
  );
}
