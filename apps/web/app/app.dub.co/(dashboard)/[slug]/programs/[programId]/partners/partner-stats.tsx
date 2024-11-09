"use client";

import usePartnersCount from "@/lib/swr/use-partners-count";
import { ProgramStats } from "@/ui/programs/program-stats";
import { useRouterStuff } from "@dub/ui";
import { ChartLine, Users } from "@dub/ui/src/icons";
import { useParams } from "next/navigation";
import { PartnerStatusBadges } from "./partner-table";

export function PartnerStats() {
  const { slug, programId } = useParams();
  const { queryParams } = useRouterStuff();

  const { partnersCount, error } = usePartnersCount();

  const allPartnersCount =
    partnersCount?.find(({ status }) => status === "all")?._count || 0;
  const activePartnersCount =
    partnersCount?.find(({ status }) => status === "approved")?._count || 0;

  const pendingPartnersCount =
    partnersCount?.find(({ status }) => status === "pending")?._count || 0;

  return (
    <div className="xs:grid-cols-4 xs:divide-x xs:divide-y-0 grid divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200">
      <ProgramStats
        label="All"
        href={`/${slug}/programs/${programId}/partners`}
        count={allPartnersCount}
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
        count={activePartnersCount}
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
        count={activePartnersCount}
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
        count={partnersCount ? pendingPartnersCount : undefined}
        icon={PartnerStatusBadges.pending.icon}
        iconClassName={PartnerStatusBadges.pending.className}
        error={!!error}
      />
    </div>
  );
}
