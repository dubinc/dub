"use client";

import usePartnersCount from "@/lib/swr/use-partners-count";
import { PartnerStatusBadges } from "@/ui/partners/partner-status-badges";
import { ProgramStatsFilter } from "@/ui/partners/program-stats-filter";
import { useRouterStuff } from "@dub/ui";
import { Users } from "@dub/ui/icons";
import { useParams } from "next/navigation";

interface PartnerCount {
  status: string;
  _count: number;
}

export function PartnerStats() {
  const { slug, programId } = useParams();
  const { queryParams } = useRouterStuff();

  const { partnersCount, error } = usePartnersCount<PartnerCount[]>({
    groupBy: "status",
    ignoreParams: true,
  });

  const { approved, pending, invited, all } =
    partnersCount?.reduce(
      (acc, { status, _count }) => ({
        ...acc,
        [status]: _count,
        all:
          (acc.all || 0) +
          (["approved", "pending", "invited"].includes(status) ? _count : 0),
      }),
      { approved: 0, pending: 0, invited: 0, all: 0 },
    ) ?? {};

  return (
    <div className="xs:grid-cols-4 xs:divide-x xs:divide-y-0 grid divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200">
      <ProgramStatsFilter
        label="All"
        href={`/${slug}/programs/${programId}/partners`}
        count={all}
        icon={Users}
        iconClassName="text-neutral-600 bg-neutral-100"
        error={!!error}
      />

      <ProgramStatsFilter
        label="Approved"
        href={
          queryParams({
            set: { status: "approved" },
            getNewPath: true,
          }) as string
        }
        count={approved}
        icon={PartnerStatusBadges.approved.icon}
        iconClassName={PartnerStatusBadges.approved.className}
        error={!!error}
      />

      <ProgramStatsFilter
        label="Pending"
        href={
          queryParams({
            set: { status: "pending" },
            getNewPath: true,
          }) as string
        }
        count={pending}
        icon={PartnerStatusBadges.pending.icon}
        iconClassName={PartnerStatusBadges.pending.className}
        error={!!error}
      />

      <ProgramStatsFilter
        label="Invited"
        href={
          queryParams({
            set: { status: "invited" },
            getNewPath: true,
          }) as string
        }
        count={invited}
        icon={PartnerStatusBadges.invited.icon}
        iconClassName={PartnerStatusBadges.invited.className}
        error={!!error}
      />
    </div>
  );
}
