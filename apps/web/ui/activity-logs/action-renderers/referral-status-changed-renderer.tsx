"use client";

import { ActivityLog } from "@/lib/types";
import { ReferralStatus } from "@dub/prisma/client";
import { ReactNode } from "react";
import { ActorChip, ReferralStatusPill } from "../activity-entry-chips";

interface StatusChangeSet {
  old: ReferralStatus | null;
  new: ReferralStatus | null;
}

function Label({ children }: { children: ReactNode }) {
  return (
    <span className="text-sm font-medium text-neutral-800">{children}</span>
  );
}

export function ReferralStatusChangedRenderer({ log }: { log: ActivityLog }) {
  const statusChange = log.changeSet?.status as StatusChangeSet | undefined;
  const status = statusChange?.new ?? null;

  if (!status) {
    return <span>Lead status updated</span>;
  }

  return (
    <>
      <Label>Lead</Label>
      <ReferralStatusPill status={status} />
      <Label>by</Label>
      <ActorChip log={log} />
    </>
  );
}
