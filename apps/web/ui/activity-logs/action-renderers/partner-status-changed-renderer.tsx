import { ActivityLog } from "@/lib/types";
import { PartnerStatusBadges } from "@/ui/partners/partner-status-badges";
import { ProgramEnrollmentStatus } from "@prisma/client";
import { ReactNode } from "react";
import { PartnerStatusPill, UserChip } from "../activity-entry-chips";

interface StatusChangeSet {
  old: ProgramEnrollmentStatus | null;
  new: ProgramEnrollmentStatus | null;
}

function Label({ children }: { children: ReactNode }) {
  return (
    <span className="text-sm font-medium text-neutral-800">{children}</span>
  );
}

export function PartnerStatusChangedRenderer({ log }: { log: ActivityLog }) {
  const statusChange = log.changeSet?.status as StatusChangeSet | undefined;
  const status = statusChange?.new ?? null;

  if (!status || !(status in PartnerStatusBadges)) {
    return <span>Status changed</span>;
  }

  return (
    <>
      <Label>Status updated to</Label>
      <PartnerStatusPill status={status} />
      {log.user ? (
        <>
          <Label>by</Label>
          <UserChip user={log.user} />
        </>
      ) : null}
    </>
  );
}
