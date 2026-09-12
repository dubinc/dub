"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { GroupProps } from "@/lib/types";
import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import { GroupColorCircle } from "@/ui/partners/groups/group-color-circle";
import { StatusBadge, Switch } from "@dub/ui";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

export type AutoApprovalGroup = Pick<
  GroupProps,
  "id" | "name" | "slug" | "color" | "autoApprovePartnersEnabledAt"
>;

// A PATCH /api/groups/[groupId] payload that Save needs to send
export type AutoApprovalUpdate = {
  groupId: string;
  autoApprovePartners: boolean;
  applyToAllGroups?: boolean;
};

// Scroll distance (px) over which the top/bottom fades go from hidden to fully visible
const FADE_SCROLL_DISTANCE = 40;

const isAutoApproveEnabled = (group: AutoApprovalGroup) =>
  Boolean(group.autoApprovePartnersEnabledAt);

/**
 * Stages auto-approve edits (per group, or enabled for every group) until the
 * application settings form is saved. Nothing here touches the API.
 */
export function useProgramAutoApproval(
  groups: AutoApprovalGroup[] | undefined,
) {
  // Per-group edits keyed by group ID; only holds values that differ from the saved value
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  // null = untouched, so the switch reflects the saved data (on when every group is enabled)
  const [allGroupsEnabled, setAllGroupsEnabledState] = useState<boolean | null>(
    null,
  );

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

  const defaultGroup: AutoApprovalGroup | undefined = sortedGroups[0];

  const getAutoApproveEnabled = useCallback(
    (group: AutoApprovalGroup) =>
      overrides[group.id] ?? isAutoApproveEnabled(group),
    [overrides],
  );

  const setGroupAutoApproveEnabled = useCallback(
    (group: AutoApprovalGroup, enabled: boolean) =>
      setOverrides((prev) => {
        const next = { ...prev };

        if (enabled === isAutoApproveEnabled(group)) {
          delete next[group.id];
        } else {
          next[group.id] = enabled;
        }

        return next;
      }),
    [],
  );

  const savedAllEnabled =
    sortedGroups.length > 0 && sortedGroups.every(isAutoApproveEnabled);

  const isAllGroupsEnabled = allGroupsEnabled ?? savedAllEnabled;

  // Switching off restores the per-group values (including any unsaved per-group edits)
  const setAllGroupsEnabled = useCallback(
    (enabled: boolean) => setAllGroupsEnabledState(enabled),
    [],
  );

  const pendingUpdates = useMemo<AutoApprovalUpdate[]>(() => {
    if (isAllGroupsEnabled) {
      return !savedAllEnabled && defaultGroup
        ? [
            {
              groupId: defaultGroup.id,
              autoApprovePartners: true,
              applyToAllGroups: true,
            },
          ]
        : [];
    }

    return sortedGroups.flatMap((group) => {
      const enabled = overrides[group.id];

      return enabled !== undefined && enabled !== isAutoApproveEnabled(group)
        ? [{ groupId: group.id, autoApprovePartners: enabled }]
        : [];
    });
  }, [
    isAllGroupsEnabled,
    savedAllEnabled,
    defaultGroup,
    sortedGroups,
    overrides,
  ]);

  return {
    sortedGroups,
    getAutoApproveEnabled,
    setGroupAutoApproveEnabled,
    allGroupsEnabled: isAllGroupsEnabled,
    setAllGroupsEnabled,
    pendingUpdates,
  };
}

export type ProgramAutoApproval = ReturnType<typeof useProgramAutoApproval>;

export function ApplicationAutoApproval({
  loading,
  autoApproval,
}: {
  loading: boolean;
  autoApproval: ProgramAutoApproval;
}) {
  const {
    sortedGroups,
    getAutoApproveEnabled,
    setGroupAutoApproveEnabled,
    allGroupsEnabled,
    setAllGroupsEnabled,
  } = autoApproval;

  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium text-neutral-900">
          Auto-approval settings
        </p>
        <p className="text-sm text-neutral-500">
          The auto-approval setting is configurable at the group level.
        </p>
      </div>

      <label className="flex w-fit cursor-pointer select-none items-center gap-3 py-1">
        <Switch
          checked={allGroupsEnabled}
          fn={setAllGroupsEnabled}
          disabled={loading}
        />
        <span className="text-sm font-medium text-neutral-900">
          Enable auto-approve for all groups
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

          <StatusBadge variant="success" icon={null} className="px-1.5 py-0.5">
            Auto-approve enabled
          </StatusBadge>
        </div>
      ) : (
        <AutoApprovalTable
          groups={sortedGroups}
          loading={loading}
          getAutoApproveEnabled={getAutoApproveEnabled}
          onAutoApproveChange={setGroupAutoApproveEnabled}
        />
      )}
    </div>
  );
}

function AutoApprovalTable({
  groups,
  loading,
  getAutoApproveEnabled,
  onAutoApproveChange,
}: {
  groups: AutoApprovalGroup[];
  loading: boolean;
  getAutoApproveEnabled: (group: AutoApprovalGroup) => boolean;
  onAutoApproveChange: (group: AutoApprovalGroup, enabled: boolean) => void;
}) {
  const { slug: workspaceSlug } = useWorkspace();

  const [fades, setFades] = useState({ top: 0, bottom: 0 });

  const updateFades = useCallback((el: HTMLElement) => {
    const maxScrollTop = el.scrollHeight - el.clientHeight;
    const top = Math.min(el.scrollTop / FADE_SCROLL_DISTANCE, 1);
    const bottom =
      maxScrollTop <= 0
        ? 0
        : Math.min((maxScrollTop - el.scrollTop) / FADE_SCROLL_DISTANCE, 1);

    setFades((prev) =>
      prev.top === top && prev.bottom === bottom ? prev : { top, bottom },
    );
  }, []);

  // Callback ref (rather than an effect): measures once the container mounts and
  // whenever it or its rows resize, e.g. when the skeleton is replaced by groups
  const scrollRef = useCallback(
    (el: HTMLDivElement | null) => {
      if (!el) return;

      const observer = new ResizeObserver(() => updateFades(el));
      observer.observe(el);
      if (el.firstElementChild) observer.observe(el.firstElementChild);

      return () => observer.disconnect();
    },
    [updateFades],
  );

  return (
    <div className="relative overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <div
        ref={scrollRef}
        onScroll={(e) => updateFades(e.currentTarget)}
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
                  <div className="h-5 w-9 animate-pulse rounded-full bg-neutral-200" />
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

                  <Switch
                    checked={getAutoApproveEnabled(group)}
                    fn={(enabled) => onAutoApproveChange(group, enabled)}
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
