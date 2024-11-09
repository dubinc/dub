"use client";

import usePartnersCount from "@/lib/swr/use-partners-count";
import { ProgramStatsFilter } from "@/ui/programs/program-stats-filter";
import { useRouterStuff } from "@dub/ui";
import { ChartLine, Users } from "@dub/ui/src/icons";
import { useParams } from "next/navigation";
import { PartnerStatusBadges } from "./partner-table";

export function PartnerStats() {
  const { slug, programId } = useParams();
  const { queryParams } = useRouterStuff();

  const { partnersCount, error } = usePartnersCount();

  return (
    <div className="xs:grid-cols-4 xs:divide-x xs:divide-y-0 grid divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200">
      <ProgramStatsFilter
        label="All"
        href={`/${slug}/programs/${programId}/partners`}
        count={partnersCount?.all}
        icon={Users}
        iconClassName="text-gray-600 bg-gray-100"
        error={!!error}
      />
      <ProgramStatsFilter
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
        count={partnersCount?.approved}
        icon={ChartLine}
        iconClassName="text-blue-600 bg-blue-100"
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
        count={partnersCount?.approved}
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
        count={partnersCount?.pending}
        icon={PartnerStatusBadges.pending.icon}
        iconClassName={PartnerStatusBadges.pending.className}
        error={!!error}
      />
    </div>
  );
}
