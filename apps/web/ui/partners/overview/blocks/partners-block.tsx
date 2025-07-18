import { editQueryString } from "@/lib/analytics/utils";
import useWorkspace from "@/lib/swr/use-workspace";
import { PartnerProps } from "@/lib/types";
import { AnalyticsContext } from "@/ui/analytics/analytics-provider";
import { ArrowUpRight, LoadingSpinner } from "@dub/ui";
import { currencyFormatter, fetcher, OG_AVATAR_URL } from "@dub/utils";
import Link from "next/link";
import { useContext } from "react";
import useSWR from "swr";
import { ProgramOverviewBlock } from "../program-overview-block";

export function PartnersBlock() {
  const { slug: workspaceSlug } = useWorkspace();

  const { queryString } = useContext(AnalyticsContext);

  const { data, isLoading, error } = useSWR<
    {
      partnerId: string;
      saleAmount: number;
      sales: number;
      partner: Pick<PartnerProps, "name" | "image">;
    }[]
  >(
    `/api/analytics?${editQueryString(queryString, {
      groupBy: "top_partners",
      event: "sales",
    })}`,
    fetcher,
  );

  return (
    <ProgramOverviewBlock
      title="Top partners by revenue"
      viewAllHref={`/${workspaceSlug}/program/partners`}
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
            No partners found
          </div>
        ) : (
          data?.slice(0, 6).map((partner) => (
            <Link
              key={partner.partnerId}
              href={`/${workspaceSlug}/program/partners?partnerId=${partner.partnerId}`}
              target="_blank"
              className="text-content-default group flex h-10 items-center justify-between text-xs font-medium"
            >
              <div className="flex min-w-0 items-center gap-2">
                <img
                  src={
                    partner.partner.image ||
                    `${OG_AVATAR_URL}${partner.partner.name}`
                  }
                  alt={`${partner.partner.name} avatar`}
                  className="size-4 rounded-full"
                />
                <span className="min-w-0 truncate">{partner.partner.name}</span>
                <ArrowUpRight className="text-content-emphasis size-2.5 -translate-x-0.5 opacity-0 transition-[opacity,transform] group-hover:translate-x-0 group-hover:opacity-100 [&_*]:stroke-2" />
              </div>

              <span>
                {currencyFormatter(partner.saleAmount / 100, {
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
