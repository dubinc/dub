"use client";

import { ActivityLog } from "@/lib/types";
import { FileText } from "lucide-react";
import { ReactNode } from "react";
import { ActorChip, SourcePill } from "../activity-entry-chips";

function Label({ children }: { children: ReactNode }) {
  return (
    <span className="text-sm font-medium text-neutral-800">{children}</span>
  );
}

export function ReferralCreatedRenderer({ log }: { log: ActivityLog }) {
  return (
    <>
      <Label>Submitted by</Label>
      <ActorChip log={log} />
      <Label>via</Label>
      <SourcePill
        icon={<FileText className="size-3 text-neutral-500" />}
        label="Submission form"
      />
    </>
  );
}
