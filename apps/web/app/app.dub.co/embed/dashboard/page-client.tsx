"use client";

import { IntervalOptions } from "@/lib/analytics/types";
import {
  EarningsChart,
  ProgramOverviewContext,
} from "@/ui/partners/earnings-chart";
import { HeroBackground } from "@/ui/partners/hero-background";
import { ProgramCommissionDescription } from "@/ui/partners/program-commission-description";
import { StatCard } from "@/ui/partners/stat-card";
import {
  Button,
  Check2,
  useCopyToClipboard,
  useRouterStuff,
  Wordmark,
} from "@dub/ui";
import { Copy, MoneyBill2 } from "@dub/ui/src/icons";
import { getPrettyUrl } from "@dub/utils";
import { Link, Program } from "@prisma/client";
import { useContext, useEffect } from "react";
import useReferralAnalytics from "../use-referral-analytics";
import { SaleTable } from "./sale-table";

export function RewardDashboardPageClient({
  program,
  link,
}: {
  program: Program;
  link: Link;
}) {
  const { searchParamsObj } = useRouterStuff();
  const [copied, copyToClipboard] = useCopyToClipboard();

  const {
    start,
    end,
    interval = "30d",
    token,
  } = searchParamsObj as {
    start?: string;
    end?: string;
    interval?: IntervalOptions;
    token?: string;
  };

  return (
    <>
      <div className="relative flex flex-col rounded-lg border border-neutral-300 bg-gradient-to-r from-neutral-50 p-4 md:p-6">
        {program && (
          <HeroBackground logo={program.logo} color={program.brandColor} />
        )}

        <span className="flex items-center gap-2 text-sm text-neutral-500">
          <MoneyBill2 className="size-4" />
          Refer and earn
        </span>

        <div className="relative mt-24 text-lg text-neutral-900 sm:max-w-[50%]">
          <ProgramCommissionDescription program={program} />
        </div>

        <span className="mb-1.5 mt-6 block text-sm text-neutral-800">
          Referral link
        </span>

        <div className="xs:flex-row relative flex flex-col items-center gap-2">
          <input
            type="text"
            readOnly
            value={getPrettyUrl(link.shortLink)}
            className="xs:w-auto h-10 w-full rounded-md border border-neutral-300 px-3 text-sm focus:border-gray-500 focus:outline-none focus:ring-gray-500 lg:min-w-64 xl:min-w-72"
          />

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
            onClick={() => copyToClipboard(getPrettyUrl(link.shortLink))}
          />
        </div>
      </div>

      <div>
        <ProgramOverviewContext.Provider
          value={{
            start: start ? new Date(start) : undefined,
            end: end ? new Date(end) : undefined,
            interval,
            color: program.brandColor ?? undefined,
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
            </div>
            <div className="mt-4">
              <SaleTable limit={10} />
            </div>
          </div>
        </ProgramOverviewContext.Provider>
      </div>

      <div className="flex items-center justify-center">
        <a
          href="https://d.to/conversions"
          target="_blank"
          className="mt-2 flex items-center justify-center gap-1 rounded-lg bg-white p-2 transition-colors"
        >
          <p className="text-sm text-gray-700">Powered by</p>
          <Wordmark className="h-4" />
        </a>
      </div>
    </>
  );
}

const EarningsChartContainer = () => {
  const { start, end, interval, color } = useContext(ProgramOverviewContext);

  const { data: { earnings: total } = {} } = useReferralAnalytics({
    interval,
    start,
    end,
  });

  const { data: timeseries, error } = useReferralAnalytics({
    groupBy: "timeseries",
    interval,
    start,
    end,
  });

  useEffect(() => {
    if (error) {
      window.parent.postMessage(
        {
          originator: "Dub",
          event: "ERROR",
          data: error.info,
        },
        "*",
      );
    }
  }, [error]);

  return (
    <EarningsChart
      timeseries={timeseries}
      total={total}
      color={color}
      error={error}
    />
  );
};

function StatCardContainer({
  title,
  event,
}: {
  title: string;
  event: "clicks" | "leads" | "sales";
}) {
  const { start, end, interval, color } = useContext(ProgramOverviewContext);

  const { data: total } = useReferralAnalytics({
    interval,
    start,
    end,
  });

  const { data: timeseries, error } = useReferralAnalytics({
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
    />
  );
}
