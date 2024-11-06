"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { PartnerCounts } from "@/lib/types";
import { ProgramStats } from "@/ui/programs/program-stats";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { PartnerStatusBadges } from "./partner-table";

export function PartnerStats({ programId }: { programId: string }) {
  const { id: workspaceId } = useWorkspace();

  const { data: partnersCounts, error } = useSWR<PartnerCounts[]>(
    `/api/programs/${programId}/partners/count?workspaceId=${workspaceId}`,
    fetcher,
  );

  const activePartnersCount =
    partnersCounts?.find(({ status }) => status === "approved")?._count || 0;

  const pendingPartnersCount =
    partnersCounts?.find(({ status }) => status === "pending")?._count || 0;

  return (
    <div className="xs:grid-cols-2 xs:divide-x xs:divide-y-0 grid divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200">
      <ProgramStats
        label="Approved"
        status="approved"
        count={partnersCounts ? activePartnersCount : undefined}
        icon={PartnerStatusBadges.approved.icon}
        iconClassName={PartnerStatusBadges.approved.className}
        error={!!error}
      />
      <ProgramStats
        label="Pending"
        status="pending"
        count={partnersCounts ? pendingPartnersCount : undefined}
        icon={PartnerStatusBadges.pending.icon}
        iconClassName={PartnerStatusBadges.pending.className}
        error={!!error}
      />
    </div>
  );
}
