"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { PartnerCounts } from "@/lib/types";
import { ProgramStats } from "@/ui/programs/program-stats";
import { useRouterStuff } from "@dub/ui";
import { ChartLine, Users } from "@dub/ui/src/icons";
import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { PartnerStatusBadges } from "./partner-table";

export function PartnerStats() {
  const { slug, programId } = useParams();
  const { id: workspaceId } = useWorkspace();
  const { queryParams } = useRouterStuff();

  const { data: partnersCounts, error } = useSWR<PartnerCounts[]>(
    `/api/programs/${programId}/partners/count?workspaceId=${workspaceId}`,
    fetcher,
  );

  const activePartnersCount =
    partnersCounts?.find(({ status }) => status === "approved")?._count || 0;

  const pendingPartnersCount =
    partnersCounts?.find(({ status }) => status === "pending")?._count || 0;

  return (
    <div className="xs:grid-cols-4 xs:divide-x xs:divide-y-0 grid divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200">
      <ProgramStats
        label="All"
        href={`/${slug}/programs/${programId}/partners`}
        count={
          partnersCounts
            ? activePartnersCount + pendingPartnersCount
            : undefined
        }
        icon={Users}
        iconClassName="text-gray-600 bg-gray-100"
        error={!!error}
      />
      <ProgramStats
        label="Top partners"
        href={
          queryParams({
            set: {
              sort: "earnings",
              order: "desc",
            },
            getNewPath: true,
          }) as string
        }
        count={partnersCounts ? activePartnersCount : undefined}
        icon={ChartLine}
        iconClassName="text-blue-600 bg-blue-100"
        error={!!error}
      />
      <ProgramStats
        label="Approved"
        href={
          queryParams({
            set: { status: "approved" },
            getNewPath: true,
          }) as string
        }
        count={partnersCounts ? activePartnersCount : undefined}
        icon={PartnerStatusBadges.approved.icon}
        iconClassName={PartnerStatusBadges.approved.className}
        error={!!error}
      />
      <ProgramStats
        label="Pending"
        href={
          queryParams({
            set: { status: "pending" },
            getNewPath: true,
          }) as string
        }
        count={partnersCounts ? pendingPartnersCount : undefined}
        icon={PartnerStatusBadges.pending.icon}
        iconClassName={PartnerStatusBadges.pending.className}
        error={!!error}
      />
    </div>
  );
}
