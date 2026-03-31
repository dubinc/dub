import { editQueryString } from "@/lib/analytics/utils";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { PartnerProps } from "@/lib/types";
import { AnalyticsContext } from "@/ui/analytics/analytics-provider";
import { ExceededEventsLimit } from "@/ui/partners/overview/exceeded-events-limit";
import { PartnerAvatar } from "@/ui/partners/partner-avatar";
import { ArrowRight, LoadingSpinner } from "@dub/ui";
import { currencyFormatter, fetcher, nFormatter } from "@dub/utils";
import Link from "next/link";
import { useContext } from "react";
import useSWR from "swr";
import { ProgramOverviewBlock } from "../program-overview-block";

export function PartnersBlock() {
  const { slug: workspaceSlug, exceededEvents } = useWorkspace();
  const { program } = useProgram();

  const { queryString } = useContext(AnalyticsContext);

  const { data, isLoading, error } = useSWR<
    {
      partnerId: string;
      leads: number;
      saleAmount: number;
      partner: Pick<PartnerProps, "name" | "image">;
    }[]
  >(
    !exceededEvents &&
      `/api/analytics?${editQueryString(queryString, {
        groupBy: "top_partners",
        event: program?.primaryRewardEvent === "lead" ? "leads" : "sales",
      })}`,
    fetcher,
  );

  return (
    <ProgramOverviewBlock
      title={`Top partners by ${program?.primaryRewardEvent === "lead" ? "leads" : "revenue"}`}
      viewAllHref={`/${workspaceSlug}/program/partners`}
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
            No partners found
          </div>
        ) : (
          data?.slice(0, 6).map((partner) => (
            <Link
              key={partner.partnerId}
              href={`/${workspaceSlug}/program/partners/${partner.partnerId}`}
              className="text-content-default group flex h-10 items-center justify-between text-xs font-medium"
            >
              <div className="flex min-w-0 items-center gap-2">
                <PartnerAvatar partner={partner.partner} className="size-4" />
                <span className="min-w-0 truncate">{partner.partner.name}</span>
                <ArrowRight className="text-content-emphasis size-2.5 -translate-x-0.5 opacity-0 transition-[opacity,transform] group-hover:translate-x-0 group-hover:opacity-100 [&_*]:stroke-2" />
              </div>

              <span>
                {program?.primaryRewardEvent === "lead"
                  ? nFormatter(partner.leads, { full: true })
                  : currencyFormatter(partner.saleAmount)}
              </span>
            </Link>
          ))
        )}
      </div>
    </ProgramOverviewBlock>
  );
}
