"use client";

import { IntervalOptions } from "@/lib/analytics/types";
import usePartnerAnalytics from "@/lib/swr/use-partner-analytics";
import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import {
  EarningsChart,
  ProgramOverviewContext,
} from "@/ui/partners/earnings-chart";
import { HeroBackground } from "@/ui/partners/hero-background";
import { ProgramCommissionDescription } from "@/ui/partners/program-commission-description";
import { StatCard } from "@/ui/partners/stat-card";
import {
  Button,
  buttonVariants,
  Check2,
  MaxWidthWrapper,
  useCopyToClipboard,
  useRouterStuff,
} from "@dub/ui";
import { Copy, MoneyBill2 } from "@dub/ui/src/icons";
import { cn, getPrettyUrl } from "@dub/utils";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useContext } from "react";
import { SaleTablePartner } from "./sales/sale-table";

export default function ProgramPageClient() {
  const { getQueryString, searchParamsObj } = useRouterStuff();
  const { partnerId, programId } = useParams();

  const { programEnrollment } = useProgramEnrollment();
  const [copied, copyToClipboard] = useCopyToClipboard();

  const {
    start,
    end,
    interval = "30d",
  } = searchParamsObj as {
    start?: string;
    end?: string;
    interval?: IntervalOptions;
  };

  const program = programEnrollment?.program;

  return (
    <MaxWidthWrapper className="pb-10">
      <div className="relative flex flex-col rounded-lg border border-neutral-300 bg-gradient-to-r from-neutral-50 p-4 md:p-6">
        {program && (
          <HeroBackground logo={program?.logo} color={program?.brandColor} />
        )}
        <span className="flex items-center gap-2 text-sm text-neutral-500">
          <MoneyBill2 className="size-4" />
          Refer and earn
        </span>
        <div className="relative mt-24 text-lg text-neutral-900 sm:max-w-[50%]">
          {program ? (
            <ProgramCommissionDescription program={program} />
          ) : (
            <div className="h-7 w-full animate-pulse rounded-md bg-neutral-200" />
          )}
        </div>
        <span className="mb-1.5 mt-6 block text-sm text-neutral-800">
          Referral link
        </span>
        <div className="xs:flex-row relative flex flex-col items-center gap-2">
          {programEnrollment?.link ? (
            <input
              type="text"
              readOnly
              value={getPrettyUrl(programEnrollment?.link.shortLink)}
              className="xs:w-auto h-10 w-full rounded-md border border-neutral-300 px-3 text-sm focus:border-gray-500 focus:outline-none focus:ring-gray-500 lg:min-w-64 xl:min-w-72"
            />
          ) : (
            <div className="h-10 w-16 animate-pulse rounded-md bg-neutral-200 lg:w-72" />
          )}
          <Button
            icon={
              copied ? (
                <Check2 className="size-4" />
              ) : (
                <Copy className="size-4" />
              )
            }
            text={copied ? "Copied link" : "Copy link"}
            className="xs:w-fit"
            onClick={() =>
              copyToClipboard(getPrettyUrl(programEnrollment?.link?.shortLink))
            }
          />
        </div>
      </div>
      <ProgramOverviewContext.Provider
        value={{
          start: start ? new Date(start) : undefined,
          end: end ? new Date(end) : undefined,
          interval,
          color: program?.brandColor ?? undefined,
        }}
      >
        <div className="mt-6 rounded-lg border border-neutral-300">
          <div className="p-4 md:p-6 md:pb-4">
            <EarningsChartContainer />
          </div>
        </div>
        <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-3">
          <StatCardContainer title="Clicks" event="clicks" />
          <StatCardContainer title="Leads" event="leads" />
          <StatCardContainer title="Sales" event="sales" />
        </div>
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-medium text-neutral-900">
              Recent sales
            </h2>
            <Link
              href={`/${partnerId}/${programId}/sales${getQueryString()}`}
              className={cn(
                buttonVariants({ variant: "secondary" }),
                "flex h-8 items-center rounded-lg border px-2 text-sm",
              )}
            >
              View all
            </Link>
          </div>
          <div className="mt-4">
            <SaleTablePartner limit={10} />
          </div>
        </div>
      </ProgramOverviewContext.Provider>
    </MaxWidthWrapper>
  );
}

function EarningsChartContainer() {
  const { start, end, interval, color } = useContext(ProgramOverviewContext);

  const { data: { earnings: total } = {} } = usePartnerAnalytics({
    interval,
    start,
    end,
  });

  const { data: timeseries, error } = usePartnerAnalytics({
    groupBy: "timeseries",
    interval,
    start,
    end,
  });

  return (
    <EarningsChart
      timeseries={timeseries}
      total={total}
      color={color}
      error={error}
    />
  );
}

function StatCardContainer({
  title,
  event,
}: {
  title: string;
  event: "clicks" | "leads" | "sales";
}) {
  const { partnerId, programId } = useParams();
  const { getQueryString } = useRouterStuff();
  const { start, end, interval, color } = useContext(ProgramOverviewContext);

  const { data: total } = usePartnerAnalytics({
    interval,
    start,
    end,
  });

  const { data: timeseries, error } = usePartnerAnalytics({
    groupBy: "timeseries",
    interval,
    start,
    end,
    event,
  });

  return (
    <StatCard
      timeseries={timeseries}
      total={total}
      error={error}
      title={title}
      event={event}
      color={color}
      href={`/${partnerId}/${programId}/analytics?event=${event}${getQueryString()?.replace("?", "&")}`}
    />
  );
}
