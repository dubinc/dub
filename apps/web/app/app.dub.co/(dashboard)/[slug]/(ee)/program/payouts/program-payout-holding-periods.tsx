"use client";

import { PAYOUT_HOLDING_PERIOD_DAYS } from "@/lib/constants/payouts";
import useWorkspace from "@/lib/swr/use-workspace";
import { GroupProps } from "@/lib/types";
import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import { GroupColorCircle } from "@/ui/partners/groups/group-color-circle";
import { MarkdownDescription } from "@/ui/shared/markdown-description";
import { StatusBadge, useResizeObserver } from "@dub/ui";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type HoldingPeriodGroup = Pick<
  GroupProps,
  "id" | "name" | "slug" | "color" | "holdingPeriodDays"
>;

const HOLDING_PERIOD_DESCRIPTION =
  "[Set how long to hold funds](https://dub.co/help/article/partner-payouts#payout-holding-period) before they are eligible for payout. 30 days is recommended.";

// Scroll distance (px) over which the top/bottom fades go from hidden to fully visible
const FADE_SCROLL_DISTANCE = 40;

export function ProgramPayoutHoldingPeriods({
  groups,
  loading,
  getHoldingPeriodDays,
  onHoldingPeriodDaysChange,
}: {
  groups?: HoldingPeriodGroup[];
  loading: boolean;
  getHoldingPeriodDays: (group: HoldingPeriodGroup) => number;
  onHoldingPeriodDaysChange: (group: HoldingPeriodGroup, days: number) => void;
}) {
  const { slug: workspaceSlug } = useWorkspace();

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
  useEffect(updateFades, [updateFades, resizeObserverEntry, sortedGroups]);

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

      <div className="relative overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <div
          ref={scrollRef}
          onScroll={updateFades}
          className="scrollbar-hide max-h-[268px] overflow-y-auto [clip-path:inset(0)]"
        >
          {/* Sticky header row */}
          <div className="sticky top-0 z-10 bg-white">
            <div className="flex h-11 items-center justify-between border-b border-neutral-200 px-4 text-sm font-semibold text-neutral-900">
              <span>Group</span>
              <span>Holding period</span>
            </div>
            {/* Top scroll fade */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-full h-8 bg-gradient-to-b from-white to-transparent"
              style={{ opacity: fades.top }}
            />
          </div>

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
              : sortedGroups.map((group) => (
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
                      group={group}
                      value={getHoldingPeriodDays(group)}
                      onChange={(days) =>
                        onHoldingPeriodDaysChange(group, days)
                      }
                    />
                  </div>
                ))}
          </div>
        </div>

        {/* Bottom scroll fade */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white to-transparent"
          style={{ opacity: fades.bottom }}
        />
      </div>
    </div>
  );
}

function HoldingPeriodSelect({
  group,
  value,
  onChange,
}: {
  group: HoldingPeriodGroup;
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
        aria-label={`Payout holding period for ${group.name}`}
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
