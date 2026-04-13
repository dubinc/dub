"use client";

import { ActivityLog } from "@/lib/types";
import { ProgramEnrollmentStatus } from "@dub/prisma/client";
import { ReactNode } from "react";
import { ActorChip, PartnerStatusPill } from "../activity-entry-chips";

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

  if (!status) {
    return <span>Partner status changed</span>;
  }

  return (
    <>
      <Label>Partner</Label>
      <PartnerStatusPill status={status} />
      <Label>by</Label>
      <ActorChip log={log} />
    </>
  );
}
