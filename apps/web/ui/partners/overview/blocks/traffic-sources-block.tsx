import { editQueryString } from "@/lib/analytics/utils";
import useWorkspace from "@/lib/swr/use-workspace";
import { AnalyticsContext } from "@/ui/analytics/analytics-provider";
import {
  ArrowUpRight,
  BlurImage,
  Link4,
  LoadingSpinner,
  useRouterStuff,
} from "@dub/ui";
import { currencyFormatter, fetcher, GOOGLE_FAVICON_URL } from "@dub/utils";
import Link from "next/link";
import { useContext } from "react";
import useSWR from "swr";
import { ProgramOverviewBlock } from "../program-overview-block";

export function TrafficSourcesBlock() {
  const { slug: workspaceSlug } = useWorkspace();

  const { getQueryString } = useRouterStuff();

  const { queryString } = useContext(AnalyticsContext);

  const { data, isLoading, error } = useSWR<
    {
      referer: string;
      saleAmount: number;
    }[]
  >(
    `/api/analytics?${editQueryString(queryString, {
      groupBy: "referers",
      event: "sales",
    })}`,
    fetcher,
  );

  return (
    <ProgramOverviewBlock
      title="Top traffic sources by revenue"
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
            No traffic sources found
          </div>
        ) : (
          data?.slice(0, 6).map(({ referer, saleAmount }) => (
            <Link
              key={referer}
              href={`/${workspaceSlug}/program/analytics${getQueryString(
                { referer },
                {
                  include: ["interval", "start", "end"],
                },
              )}`}
              target="_blank"
              className="text-content-default group flex h-10 items-center justify-between text-xs font-medium"
            >
              <div className="flex min-w-0 items-center gap-2">
                {referer === "(direct)" ? (
                  <Link4 className="size-4" />
                ) : (
                  <BlurImage
                    src={`${GOOGLE_FAVICON_URL}${referer}`}
                    alt={`${referer} icon`}
                    width={16}
                    height={16}
                    className="size-4 rounded-full"
                  />
                )}
                <span className="min-w-0 truncate">
                  {referer === "(direct)" ? "Direct" : referer}
                </span>
                <ArrowUpRight className="text-content-emphasis size-2.5 -translate-x-0.5 opacity-0 transition-[opacity,transform] group-hover:translate-x-0 group-hover:opacity-100 [&_*]:stroke-2" />
              </div>

              <span>
                {currencyFormatter(saleAmount / 100, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </Link>
          ))
        )}
      </div>
    </ProgramOverviewBlock>
  );
}
