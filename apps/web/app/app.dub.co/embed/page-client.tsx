"use client";

import { IntervalOptions } from "@/lib/analytics/types";
import { ProgramCommissionDescription } from "@/ui/partners/program-commission-description";
import { Button, Check2, useCopyToClipboard, useRouterStuff } from "@dub/ui";
import { Copy, MoneyBill2 } from "@dub/ui/src/icons";
import { getPrettyUrl } from "@dub/utils";
import { ProgramOverviewContext } from "./context";
import { EarningsChart } from "./earnings-chart";
import { HeroBackground } from "./hero-background";
import { SaleTable } from "./sale-table";
import { StatCard } from "./stat-card";
import { useReferralLink } from "./use-referral-link";
import { useReferralProgram } from "./use-referral-program";

export function ReferralsEmbedPageClient() {
  const { program } = useReferralProgram();
  const [copied, copyToClipboard] = useCopyToClipboard();
  const { searchParamsObj } = useRouterStuff();
  const { link, isLoading: isLoadingLink } = useReferralLink();

  const {
    start,
    end,
    interval = "30d",
  } = searchParamsObj as {
    start?: string;
    end?: string;
    interval?: IntervalOptions;
  };

  const color = "#8B5CF6"; // TODO: Read this from a program attribute

  return (
    <>
      <div className="relative flex flex-col rounded-lg border border-neutral-300 bg-gradient-to-r from-neutral-50 p-4 md:p-6">
        {program && <HeroBackground logo={program?.logo} color={color} />}
        <span className="flex items-center gap-2 text-sm text-neutral-500">
          <MoneyBill2 className="size-4" />
          Refer and earn
        </span>
        <div className="relative mt-24 text-lg text-neutral-900 sm:max-w-[50%]">
          {program ? (
            <ProgramCommissionDescription program={program} />
          ) : (
            <div className="mb-7 h-7 w-full animate-pulse rounded-md bg-neutral-200" />
          )}
        </div>
        <span className="mb-1.5 mt-6 block text-sm text-neutral-800">
          Referral link
        </span>
        <div className="xs:flex-row relative flex flex-col items-center gap-2">
          {!isLoadingLink && link ? (
            <input
              type="text"
              readOnly
              value={getPrettyUrl(link.shortLink)}
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
            onClick={() => copyToClipboard(getPrettyUrl(link?.shortLink))}
          />
        </div>
      </div>
      <ProgramOverviewContext.Provider
        value={{
          start: start ? new Date(start) : undefined,
          end: end ? new Date(end) : undefined,
          interval,
          color,
        }}
      >
        <div className="mt-6 rounded-lg border border-neutral-300">
          <div className="p-4 md:p-6 md:pb-4">
            <EarningsChart />
          </div>
        </div>
        <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-3">
          <StatCard title="Clicks" event="clicks" />
          <StatCard title="Leads" event="leads" />
          <StatCard title="Sales" event="sales" />
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
    </>
  );
}
