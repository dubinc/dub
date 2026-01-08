import { editQueryString } from "@/lib/analytics/utils";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { AnalyticsContext } from "@/ui/analytics/analytics-provider";
import {
  ArrowUpRight,
  LinkLogo,
  LoadingSpinner,
  useRouterStuff,
} from "@dub/ui";
import {
  currencyFormatter,
  fetcher,
  getApexDomain,
  getPrettyUrl,
  nFormatter,
} from "@dub/utils";
import Link from "next/link";
import { useContext } from "react";
import useSWR from "swr";
import { ExceededEventsLimit } from "../exceeded-events-limit";
import { ProgramOverviewBlock } from "../program-overview-block";

export function LinksBlock() {
  const { slug: workspaceSlug, exceededEvents } = useWorkspace();
  const { program } = useProgram();

  const { getQueryString } = useRouterStuff();

  const { queryString } = useContext(AnalyticsContext);

  const { data, isLoading, error } = useSWR<
    {
      shortLink: string;
      url: string;
      domain: string;
      key: string;
      leads: number;
      saleAmount: number;
    }[]
  >(
    !exceededEvents &&
      `/api/analytics?${editQueryString(queryString, {
        groupBy: "top_links",
        event: program?.primaryRewardEvent === "lead" ? "leads" : "sales",
      })}`,
    fetcher,
  );

  return (
    <ProgramOverviewBlock
      title={`Top links by ${program?.primaryRewardEvent === "lead" ? "leads" : "revenue"}`}
      viewAllHref={`/${workspaceSlug}/program/analytics${getQueryString(
        undefined,
        {
          include: ["interval", "start", "end"],
        },
      )}`}
    >
      <div className="divide-border-subtle @2xl:h-60 flex h-auto flex-col divide-y">
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
            No links found
          </div>
        ) : (
          data
            ?.slice(0, 6)
            .map(({ shortLink, url, domain, key, leads, saleAmount }) => (
              <Link
                key={shortLink}
                href={`/${workspaceSlug}/links/${domain}/${key}`}
                target="_blank"
                className="text-content-default group flex h-10 items-center justify-between text-xs font-medium"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <LinkLogo
                    apexDomain={getApexDomain(url)}
                    className="size-4 shrink-0 sm:size-4"
                  />
                  <span className="min-w-0 truncate">
                    {getPrettyUrl(shortLink)}
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
