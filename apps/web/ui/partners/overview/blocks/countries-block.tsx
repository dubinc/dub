import { editQueryString } from "@/lib/analytics/utils";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { AnalyticsContext } from "@/ui/analytics/analytics-provider";
import { ArrowUpRight, Link4, LoadingSpinner, useRouterStuff } from "@dub/ui";
import { COUNTRIES, currencyFormatter, fetcher, nFormatter } from "@dub/utils";
import Link from "next/link";
import { useContext } from "react";
import useSWR from "swr";
import { ProgramOverviewBlock } from "../program-overview-block";

export function CountriesBlock() {
  const { slug: workspaceSlug } = useWorkspace();
  const { program } = useProgram();

  const { getQueryString } = useRouterStuff();

  const { queryString } = useContext(AnalyticsContext);

  const { data, isLoading, error } = useSWR<
    {
      country: string;
      leads: number;
      saleAmount: number;
    }[]
  >(
    `/api/analytics?${editQueryString(queryString, {
      groupBy: "countries",
      event: program?.primaryRewardEvent === "lead" ? "leads" : "sales",
    })}`,
    fetcher,
  );

  return (
    <ProgramOverviewBlock
      title={`Top countries by ${program?.primaryRewardEvent === "lead" ? "leads" : "revenue"}`}
      viewAllHref={`/${workspaceSlug}/program/analytics${getQueryString(
        undefined,
        {
          include: ["interval", "start", "end"],
        },
      )}`}
    >
      <div className="divide-border-subtle @2xl:h-60 flex h-auto flex-col divide-y">
        {isLoading ? (
          <div className="flex size-full items-center justify-center py-4">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <div className="text-content-subtle flex size-full items-center justify-center py-4 text-xs">
            Failed to load data
          </div>
        ) : data?.length === 0 ? (
          <div className="text-content-subtle flex size-full items-center justify-center py-4 text-xs">
            No countries found
          </div>
        ) : (
          data?.slice(0, 6).map(({ country, leads, saleAmount }) => (
            <Link
              key={country}
              href={`/${workspaceSlug}/program/analytics${getQueryString(
                { country },
                {
                  include: ["interval", "start", "end"],
                },
              )}`}
              target="_blank"
              className="text-content-default group flex h-10 items-center justify-between text-xs font-medium"
            >
              <div className="flex min-w-0 items-center gap-2">
                {country === "(direct)" ? (
                  <Link4 className="size-4" />
                ) : (
                  <img
                    src={`https://hatscripts.github.io/circle-flags/flags/${country.toLowerCase()}.svg`}
                    alt={`${country} flag`}
                    className="size-4 shrink-0"
                  />
                )}
                <span className="min-w-0 truncate">
                  {COUNTRIES?.[country] ?? country}
                </span>
                <ArrowUpRight className="text-content-emphasis size-2.5 -translate-x-0.5 opacity-0 transition-[opacity,transform] group-hover:translate-x-0 group-hover:opacity-100 [&_*]:stroke-2" />
              </div>

              <span>
                {program?.primaryRewardEvent === "lead"
                  ? nFormatter(leads, { full: true })
                  : currencyFormatter(saleAmount)}
              </span>
            </Link>
          ))
        )}
      </div>
    </ProgramOverviewBlock>
  );
}
