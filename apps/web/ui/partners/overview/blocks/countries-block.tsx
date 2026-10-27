import { editQueryString } from "@/lib/analytics/utils";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { AnalyticsContext } from "@/ui/analytics/analytics-provider";
import { CountryFlag } from "@/ui/shared/country-flag";
import { Link4, LoadingSpinner, useRouterStuff } from "@dub/ui";
import { COUNTRIES, currencyFormatter, fetcher, nFormatter } from "@dub/utils";
import { useContext } from "react";
import useSWR from "swr";
import { ExceededEventsLimit } from "../exceeded-events-limit";
import { ProgramOverviewBlock } from "../program-overview-block";
import { ProgramOverviewRow } from "../program-overview-row";

export function CountriesBlock() {
  const { slug: workspaceSlug, exceededEvents } = useWorkspace();
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
    !exceededEvents &&
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
      className="pb-3.5"
      contentClassName="px-3"
    >
      <div className="@2xl:h-[257px] flex h-auto flex-col">
        {exceededEvents ? (
          <ExceededEventsLimit />
        ) : isLoading ? (
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
            <ProgramOverviewRow
              key={country}
              href={`/${workspaceSlug}/program/analytics${getQueryString(
                { country },
                {
                  include: ["interval", "start", "end"],
                },
              )}`}
            >
              <div className="flex min-w-0 items-center gap-2">
                {country === "(direct)" ? (
                  <Link4 className="size-4" />
                ) : (
                  <CountryFlag countryCode={country} />
                )}
                <span className="min-w-0 truncate">
                  {COUNTRIES?.[country] ?? country}
                </span>
              </div>

              <span>
                {program?.primaryRewardEvent === "lead"
                  ? nFormatter(leads, { full: true })
                  : currencyFormatter(saleAmount)}
              </span>
            </ProgramOverviewRow>
          ))
        )}
      </div>
    </ProgramOverviewBlock>
  );
}
