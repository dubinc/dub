"use client";

import { AdminNetworkPartner } from "@/lib/types";
import { History } from "@dub/ui/icons";
import { NetworkPartnerChangeHistoryItem } from "./network-partner-change-history-item";

export function NetworkPartnerChangeHistory({
  changeHistoryLog,
}: {
  changeHistoryLog: AdminNetworkPartner["changeHistoryLog"];
}) {
  const entries = (changeHistoryLog ?? []).toSorted(
    (a, b) =>
      new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime(),
  );

  return (
    <section className="rounded-xl border border-neutral-200 bg-neutral-100 p-4">
      <div className="flex items-center gap-2">
        <History className="size-4 text-neutral-500" />
        <h3 className="text-sm font-semibold text-neutral-900">Change history</h3>
      </div>

      {entries.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-500">
          No changes have been recorded yet.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {entries.map((entry, index) => (
            <NetworkPartnerChangeHistoryItem
              key={`${entry.field}-${new Date(entry.changedAt).toISOString()}-${index}`}
              entry={entry}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
