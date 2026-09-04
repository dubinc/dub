"use client";

import { PAYOUT_HOLDING_PERIOD_DAYS } from "@/lib/constants/payouts";
import useWorkspace from "@/lib/swr/use-workspace";
import { GroupProps } from "@/lib/types";
import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import { GroupColorCircle } from "@/ui/partners/groups/group-color-circle";
import { MarkdownDescription } from "@/ui/shared/markdown-description";
import { StatusBadge, Switch, useResizeObserver } from "@dub/ui";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type HoldingPeriodGroup = Pick<
  GroupProps,
  "id" | "name" | "slug" | "color" | "holdingPeriodDays"
>;

// A PATCH /api/groups/[groupId] payload that Save needs to send
export type HoldingPeriodUpdate = {
  groupId: string;
  holdingPeriodDays: number;
  applyToAllGroups?: boolean;
};

type AllGroupsState = { enabled: false } | { enabled: true; days: number };

const HOLDING_PERIOD_DESCRIPTION =
  "[Set how long to hold funds](https://dub.co/help/article/partner-payouts#payout-holding-period) before they are eligible for payout. 30 days is recommended.";

// Scroll distance (px) over which the top/bottom fades go from hidden to fully visible
const FADE_SCROLL_DISTANCE = 40;

/**
 * Stages holding period edits (per group, or one value for all groups) until
 * the payout settings form is saved. Nothing here touches the API.
 */
export function useProgramHoldingPeriods(
  groups: HoldingPeriodGroup[] | undefined,
) {
  // Per-group edits keyed by group ID; only holds values that differ from the saved value
  const [overrides, setOverrides] = useState<Record<string, number>>({});

  // null = untouched, so the switch reflects the saved data (on when every group already shares one value)
  const [allGroups, setAllGroups] = useState<AllGroupsState | null>(null);

  // Always list the default group first
  const sortedGroups = useMemo(() => {
    if (!groups) return [];

    const defaultGroup = groups.find(
      (group) => group.slug === DEFAULT_PARTNER_GROUP.slug,
    );

    return defaultGroup
      ? [defaultGroup, ...groups.filter((group) => group !== defaultGroup)]
      : groups;
  }, [groups]);

  const defaultGroup: HoldingPeriodGroup | undefined = sortedGroups[0];

  const getHoldingPeriodDays = useCallback(
    (group: HoldingPeriodGroup) =>
      overrides[group.id] ?? group.holdingPeriodDays,
    [overrides],
  );

  const setGroupHoldingPeriodDays = useCallback(
    (group: HoldingPeriodGroup, days: number) =>
      setOverrides((prev) => {
        const next = { ...prev };

        if (days === group.holdingPeriodDays) {
          delete next[group.id];
        } else {
          next[group.id] = days;
        }

        return next;
      }),
    [],
  );

  const savedValuesMatch =
    sortedGroups.length > 1 &&
    sortedGroups.every(
      (group) => group.holdingPeriodDays === sortedGroups[0].holdingPeriodDays,
    );

  const allGroupsEnabled = allGroups ? allGroups.enabled : savedValuesMatch;

  const allGroupsDays = allGroups?.enabled
    ? allGroups.days
    : defaultGroup?.holdingPeriodDays ?? PAYOUT_HOLDING_PERIOD_DAYS[0];

  // Switching on starts from the default group's current value; switching off
  // restores the per-group values (including any unsaved per-group edits)
  const setAllGroupsEnabled = useCallback(
    (enabled: boolean) =>
      setAllGroups(
        enabled && defaultGroup
          ? { enabled: true, days: getHoldingPeriodDays(defaultGroup) }
          : { enabled: false },
      ),
    [defaultGroup, getHoldingPeriodDays],
  );

  const setAllGroupsDays = useCallback(
    (days: number) => setAllGroups({ enabled: true, days }),
    [],
  );

  const pendingUpdates = useMemo<HoldingPeriodUpdate[]>(() => {
    if (allGroupsEnabled) {
      const needsUpdate = sortedGroups.some(
        (group) => group.holdingPeriodDays !== allGroupsDays,
      );

      return needsUpdate && defaultGroup
        ? [
            {
              groupId: defaultGroup.id,
              holdingPeriodDays: allGroupsDays,
              applyToAllGroups: true,
            },
          ]
        : [];
    }

    return sortedGroups.flatMap((group) => {
      const days = overrides[group.id];

      return days !== undefined && days !== group.holdingPeriodDays
        ? [{ groupId: group.id, holdingPeriodDays: days }]
        : [];
    });
  }, [allGroupsEnabled, allGroupsDays, defaultGroup, sortedGroups, overrides]);

  return {
    sortedGroups,
    getHoldingPeriodDays,
    setGroupHoldingPeriodDays,
    allGroupsEnabled,
    allGroupsDays,
    setAllGroupsEnabled,
    setAllGroupsDays,
    pendingUpdates,
  };
}

export type ProgramHoldingPeriods = ReturnType<typeof useProgramHoldingPeriods>;

export function ProgramPayoutHoldingPeriods({
  loading,
  holdingPeriods,
}: {
  loading: boolean;
  holdingPeriods: ProgramHoldingPeriods;
}) {
  const {
    sortedGroups,
    getHoldingPeriodDays,
    setGroupHoldingPeriodDays,
    allGroupsEnabled,
    allGroupsDays,
    setAllGroupsEnabled,
    setAllGroupsDays,
  } = holdingPeriods;

  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-base font-semibold leading-6 text-neutral-900">
          Payout holding period
        </h4>
        <MarkdownDescription className="text-sm font-medium text-neutral-500">
          {HOLDING_PERIOD_DESCRIPTION}
        </MarkdownDescription>
      </div>

      <label className="flex w-fit cursor-pointer select-none items-center gap-3 py-1">
        <Switch
          checked={allGroupsEnabled}
          fn={setAllGroupsEnabled}
          disabled={loading}
        />
        <span className="text-sm font-medium text-neutral-900">
          Use one holding period for all groups
        </span>
      </label>

      {allGroupsEnabled ? (
        <div className="flex h-11 items-center justify-between gap-4 rounded-lg border border-neutral-200 bg-white px-4">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex -space-x-1">
              {sortedGroups.slice(0, 3).map((group) => (
                <div key={group.id} className="rounded-full ring-2 ring-white">
                  <GroupColorCircle group={group} />
                </div>
              ))}
            </div>
            <span className="text-sm font-medium text-neutral-700">
              All groups
            </span>
            <span className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-xs font-semibold text-neutral-700">
              {sortedGroups.length}
            </span>
          </div>

          <HoldingPeriodSelect
            label="all groups"
            value={allGroupsDays}
            onChange={setAllGroupsDays}
          />
        </div>
      ) : (
        <HoldingPeriodsTable
          groups={sortedGroups}
          loading={loading}
          getHoldingPeriodDays={getHoldingPeriodDays}
          onHoldingPeriodDaysChange={setGroupHoldingPeriodDays}
        />
      )}
    </div>
  );
}

function HoldingPeriodsTable({
  groups,
  loading,
  getHoldingPeriodDays,
  onHoldingPeriodDaysChange,
}: {
  groups: HoldingPeriodGroup[];
  loading: boolean;
  getHoldingPeriodDays: (group: HoldingPeriodGroup) => number;
  onHoldingPeriodDaysChange: (group: HoldingPeriodGroup, days: number) => void;
}) {
  const { slug: workspaceSlug } = useWorkspace();

  const scrollRef = useRef<HTMLDivElement>(null);
  const [fades, setFades] = useState({ top: 0, bottom: 0 });

  const updateFades = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const maxScrollTop = el.scrollHeight - el.clientHeight;

    setFades({
      top: Math.min(el.scrollTop / FADE_SCROLL_DISTANCE, 1),
      bottom:
        maxScrollTop <= 0
          ? 0
          : Math.min((maxScrollTop - el.scrollTop) / FADE_SCROLL_DISTANCE, 1),
    });
  }, []);

  // Re-measure when the container resizes or the rows change
  const resizeObserverEntry = useResizeObserver(scrollRef);
  useEffect(updateFades, [updateFades, resizeObserverEntry, groups]);

  return (
    <div className="relative overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <div
        ref={scrollRef}
        onScroll={updateFades}
        className="scrollbar-hide max-h-[268px] overflow-y-auto [clip-path:inset(0)]"
      >
        <div className="divide-y divide-neutral-200">
          {loading
            ? [...Array(3)].map((_, idx) => (
                <div
                  key={idx}
                  className="flex h-11 items-center justify-between px-4"
                >
                  <div className="h-4 w-32 animate-pulse rounded-md bg-neutral-200" />
                  <div className="h-4 w-16 animate-pulse rounded-md bg-neutral-200" />
                </div>
              ))
            : groups.map((group) => (
                <div
                  key={group.id}
                  className="flex h-11 items-center justify-between gap-4 px-4"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Link
                      href={`/${workspaceSlug}/program/groups/${group.slug}/settings`}
                      target="_blank"
                      className="flex min-w-0 items-center gap-2 rounded-md text-sm font-medium text-neutral-700 transition-colors hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500"
                    >
                      <GroupColorCircle group={group} />
                      <span className="truncate">{group.name}</span>
                    </Link>
                    {group.slug === DEFAULT_PARTNER_GROUP.slug && (
                      <StatusBadge
                        variant="new"
                        icon={null}
                        className="px-1.5 py-0.5"
                      >
                        Default
                      </StatusBadge>
                    )}
                  </div>

                  <HoldingPeriodSelect
                    label={group.name}
                    value={getHoldingPeriodDays(group)}
                    onChange={(days) => onHoldingPeriodDaysChange(group, days)}
                  />
                </div>
              ))}
        </div>
      </div>

      {/* Top scroll fade */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-white to-transparent"
        style={{ opacity: fades.top }}
      />

      {/* Bottom scroll fade */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white to-transparent"
        style={{ opacity: fades.bottom }}
      />
    </div>
  );
}

function HoldingPeriodSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (days: number) => void;
}) {
  // The native <select> is stretched invisibly over the label so the closed
  // state matches the design while still opening the system dropdown
  return (
    <div className="relative -mr-2 flex h-8 shrink-0 items-center gap-2 rounded-md px-2 text-sm text-neutral-800 transition-colors hover:bg-neutral-100 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-neutral-500">
      <span aria-hidden>{value} days</span>
      <ChevronDown className="size-3 text-neutral-600" aria-hidden />
      <select
        aria-label={`Payout holding period for ${label}`}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="absolute inset-0 size-full cursor-pointer opacity-0"
      >
        {PAYOUT_HOLDING_PERIOD_DAYS.map((days) => (
          <option key={days} value={days}>
            {days} days{days === 30 ? " (recommended)" : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
