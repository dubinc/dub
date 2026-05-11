"use client";

import { AdminNetworkPartner } from "@/lib/types";
import { NetworkStatusBadges } from "@/ui/partners/partner-network/network-status-badges";
import { CountryFlag } from "@/ui/shared/country-flag";
import { StatusBadge, TimestampTooltip } from "@dub/ui";
import { capitalize, COUNTRIES, formatDate } from "@dub/utils";

type PartnerChangeLogEntry = NonNullable<AdminNetworkPartner["changeHistoryLog"]>[number];

const FIELD_LABELS: Record<PartnerChangeLogEntry["field"], string> = {
  country: "Country",
  profileType: "Profile type",
  networkStatus: "Network status",
};

export function NetworkPartnerChangeHistoryItem({
  entry,
}: {
  entry: PartnerChangeLogEntry;
}) {
  return (
    <li className="rounded-lg border border-neutral-200 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
          {FIELD_LABELS[entry.field]}
        </p>
        <TimestampTooltip
          timestamp={entry.changedAt}
          side="left"
          rows={["local", "utc", "unix"]}
        >
          <time className="text-xs text-neutral-500">
            {formatDate(entry.changedAt, {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </time>
        </TimestampTooltip>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        {renderChangeValue(entry.field, entry.from)}
        <span className="text-neutral-400">→</span>
        {renderChangeValue(entry.field, entry.to)}
      </div>
    </li>
  );
}

function renderChangeValue(
  field: PartnerChangeLogEntry["field"],
  value: PartnerChangeLogEntry["from"] | PartnerChangeLogEntry["to"],
) {
  if (field === "networkStatus" && value) {
    const { label, icon, variant } = NetworkStatusBadges[value];
    return (
      <StatusBadge variant={variant} icon={icon}>
        {label}
      </StatusBadge>
    );
  }

  if (field === "country" && value) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-xs font-medium text-neutral-700">
        <CountryFlag countryCode={value} className="size-3.5" />
        {COUNTRIES[value] || value}
      </span>
    );
  }

  const label =
    value === null
      ? "Not set"
      : capitalize(value);

  return (
    <span className="inline-flex items-center rounded-md border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-xs font-medium text-neutral-700">
      {label}
    </span>
  );
}
