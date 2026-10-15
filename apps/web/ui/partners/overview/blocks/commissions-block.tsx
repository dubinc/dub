import useWorkspace from "@/lib/swr/use-workspace";
import { CommissionResponse } from "@/lib/types";
import { AnalyticsContext } from "@/ui/analytics/analytics-provider";
import { PartnerAvatar } from "@/ui/partners/partner-avatar";
import { LoadingSpinner, StatusBadge } from "@dub/ui";
import { currencyFormatter, fetcher } from "@dub/utils";
import { useContext } from "react";
import useSWR from "swr";
import { CommissionStatusBadges } from "../../commission-status-badges";
import { ProgramOverviewBlock } from "../program-overview-block";
import { ProgramOverviewRow } from "../program-overview-row";

export function CommissionsBlock() {
  const { slug: workspaceSlug } = useWorkspace();

  const { queryString } = useContext(AnalyticsContext);

  const { data, error, isLoading } = useSWR<CommissionResponse[]>(
    `/api/commissions?${queryString}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return (
    <ProgramOverviewBlock
      title="Recent commissions"
      viewAllHref={`/${workspaceSlug}/program/commissions`}
      className="pb-3.5"
      contentClassName="px-3"
    >
      <div className="@2xl:h-[257px] flex h-auto flex-col">
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
            No commissions found
          </div>
        ) : (
          data?.slice(0, 6).map(({ id, partner, status, earnings }) => {
            const badge = CommissionStatusBadges[status];

            return (
              <ProgramOverviewRow
                key={id}
                href={`/${workspaceSlug}/program/commissions/${id}`}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <PartnerAvatar partner={partner} className="size-4" />
                  <span className="min-w-0 truncate">{partner.name}</span>
                </div>

                <div className="flex items-center gap-2">
                  <StatusBadge
                    icon={null}
                    variant={badge.variant}
                    className="py-0.5"
                  >
                    {badge.label}
                  </StatusBadge>

                  <span className="min-w-12 text-right">
                    {currencyFormatter(earnings)}
                  </span>
                </div>
              </ProgramOverviewRow>
            );
          })
        )}
      </div>
    </ProgramOverviewBlock>
  );
}
