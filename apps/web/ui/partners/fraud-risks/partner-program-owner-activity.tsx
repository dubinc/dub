"use client";

import { getPlanCapabilities } from "@/lib/plan-capabilities";
import useWorkspace from "@/lib/swr/use-workspace";
import { PartnerCrossProgramSummary } from "./partner-cross-program-summary";

export function PartnerProgramOwnerActivity({
  partnerId,
}: {
  partnerId: string;
}) {
  const { plan } = useWorkspace();
  const { canManageFraudEvents } = getPlanCapabilities(plan);

  if (!canManageFraudEvents) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <h3 className="text-content-emphasis text-sm font-semibold">
        Program owner activity
      </h3>
      <PartnerCrossProgramSummary key={partnerId} partnerId={partnerId} />
    </div>
  );
}
