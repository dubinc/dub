import useWorkspace from "@/lib/swr/use-workspace";
import { CommissionResponse } from "@/lib/types";
import { LoadingSpinner, StatusBadge } from "@dub/ui";
import { currencyFormatter, fetcher, OG_AVATAR_URL } from "@dub/utils";
import useSWR from "swr";
import { CommissionStatusBadges } from "../../commission-status-badges";
import { ProgramOverviewBlock } from "../program-overview-block";

export function CommissionsBlock() {
  const {
    id: workspaceId,
    slug: workspaceSlug,
    defaultProgramId,
  } = useWorkspace();

  const { data, error, isLoading } = useSWR<CommissionResponse[]>(
    `/api/commissions?${new URLSearchParams({
      workspaceId: workspaceId!,
      programId: defaultProgramId!,
      pageSize: "6",
      interval: "90d",
    })}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return (
    <ProgramOverviewBlock
      title="Recent commissions"
      viewAllHref={`/${workspaceSlug}/program/commissions`}
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
            No commissions found
          </div>
        ) : (
          data?.slice(0, 6).map(({ id, partner, status, earnings }) => {
            const badge = CommissionStatusBadges[status];

            return (
              <div
                key={id}
                className="text-content-default flex h-10 items-center justify-between text-xs font-medium"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <img
                    src={partner.image || `${OG_AVATAR_URL}${partner.name}`}
                    alt={`${partner.name} avatar`}
                    className="size-4 rounded-full"
                  />
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
                    {currencyFormatter(earnings / 100, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </ProgramOverviewBlock>
  );
}
