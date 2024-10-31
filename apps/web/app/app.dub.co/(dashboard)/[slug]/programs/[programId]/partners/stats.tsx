"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { fetcher } from "@dub/utils";
import { ProgramEnrollmentStatus } from "@prisma/client";
import useSWR from "swr";

interface PartnersCount {
  status: ProgramEnrollmentStatus;
  _count: number;
}

export function PartnerStats({ programId }: { programId: string }) {
  const { id: workspaceId } = useWorkspace();

  const { data: partnersCounts } = useSWR<PartnersCount[]>(
    `/api/programs/${programId}/partners/count?workspaceId=${workspaceId}`,
    fetcher,
  );

  const pendingPartnersCount =
    partnersCounts?.find((partner) => partner.status === "pending")?._count ||
    0;

  const activePartnersCount =
    partnersCounts?.find((partner) => partner.status === "approved")?._count ||
    0;

  return (
    <div className="flex w-full gap-4">
      <div className="flex basis-1/3 flex-col items-start justify-start gap-1 rounded-lg border border-neutral-300 px-4 py-3">
        <div className="text-[13px] font-normal text-neutral-500">All</div>
        <div className="text-lg font-semibold leading-tight text-neutral-800">
          {pendingPartnersCount + activePartnersCount}
        </div>
      </div>

      <div className="flex basis-1/3 flex-col items-start justify-start gap-1 rounded-lg border border-neutral-300 px-4 py-3">
        <div className="text-[13px] font-normal text-neutral-500">Pending</div>
        <div className="text-lg font-semibold leading-tight text-neutral-800">
          {pendingPartnersCount}
        </div>
      </div>

      <div className="flex basis-1/3 flex-col items-start justify-start gap-1 rounded-lg border border-neutral-300 px-4 py-3">
        <div className="text-[13px] font-normal text-neutral-500">Active</div>
        <div className="text-lg font-semibold leading-tight text-neutral-800">
          {activePartnersCount}
        </div>
      </div>
    </div>
  );
}
