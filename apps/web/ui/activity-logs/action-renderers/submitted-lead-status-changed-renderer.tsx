"use client";

import { ActivityLog } from "@/lib/types";
import { SubmittedLeadStatus } from "@dub/prisma/client";
import { ReactNode } from "react";
import { ActorChip, SubmittedLeadStatusPill } from "../activity-entry-chips";

interface StatusChangeSet {
  old: SubmittedLeadStatus | null;
  new: SubmittedLeadStatus | null;
}

function Label({ children }: { children: ReactNode }) {
  return (
    <span className="text-sm font-medium text-neutral-800">{children}</span>
  );
}

export function SubmittedLeadStatusChangedRenderer({
  log,
}: {
  log: ActivityLog;
}) {
  const statusChange = log.changeSet?.status as StatusChangeSet | undefined;
  const status = statusChange?.new ?? null;

  if (!status) {
    return <span>Lead status updated</span>;
  }

  return (
    <>
      <Label>Lead</Label>
      <SubmittedLeadStatusPill status={status} />
      <Label>by</Label>
      <ActorChip log={log} />
    </>
  );
}
