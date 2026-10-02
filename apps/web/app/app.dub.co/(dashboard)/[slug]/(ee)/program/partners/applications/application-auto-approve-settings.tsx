"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { GroupProps } from "@/lib/types";
import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import { GroupColorCircle } from "@/ui/partners/groups/group-color-circle";
import { AnimatedSizeContainer, StatusBadge, Switch } from "@dub/ui";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

export type AutoApproveGroup = Pick<
  GroupProps,
  "id" | "name" | "slug" | "color" | "autoApprovePartnersEnabledAt"
>;

export type AutoApproveUpdate = {
  groupId: string;
  autoApprovePartners: boolean;
  applyToAllGroups?: boolean;
};

type AllGroupsState = { enabled: boolean };

const FADE_SCROLL_DISTANCE = 40;

export function useApplicationAutoApproveSettings(
  groups: AutoApproveGroup[] | undefined,
) {
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [allGroups, setAllGroups] = useState<AllGroupsState | null>(null);

  const sortedGroups = useMemo(() => {
    if (!groups) return [];

    const defaultGroup = groups.find(
      (group) => group.slug === DEFAULT_PARTNER_GROUP.slug,
    );

    return defaultGroup
      ? [defaultGroup, ...groups.filter((group) => group !== defaultGroup)]
      : groups;
  }, [groups]);

  const defaultGroup = sortedGroups[0];

  const isGroupEnabled = useCallback(
    (group: AutoApproveGroup) =>
      overrides[group.id] ?? Boolean(group.autoApprovePartnersEnabledAt),
    [overrides],
  );

  const setGroupEnabled = useCallback(
    (group: AutoApproveGroup, enabled: boolean) =>
      setOverrides((prev) => {
        const next = { ...prev };
        const saved = Boolean(group.autoApprovePartnersEnabledAt);

        if (enabled === saved) {
          delete next[group.id];
        } else {
          next[group.id] = enabled;
        }

        return next;
      }),
    [],
  );

  const savedAllEnabled =
    sortedGroups.length > 0 &&
    sortedGroups.every((group) => Boolean(group.autoApprovePartnersEnabledAt));

  const allGroupsEnabled = allGroups ? allGroups.enabled : savedAllEnabled;

  const setAllGroupsEnabled = useCallback((enabled: boolean) => {
    setAllGroups({ enabled });
  }, []);

  const pendingUpdates = useMemo<AutoApproveUpdate[]>(() => {
    if (allGroupsEnabled) {
      const needsUpdate = sortedGroups.some(
        (group) => !group.autoApprovePartnersEnabledAt,
      );

      return needsUpdate && defaultGroup
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

      return enabled !== undefined &&
        enabled !== Boolean(group.autoApprovePartnersEnabledAt)
        ? [{ groupId: group.id, autoApprovePartners: enabled }]
        : [];
    });
  }, [allGroupsEnabled, defaultGroup, sortedGroups, overrides]);

  return {
    sortedGroups,
    isGroupEnabled,
    setGroupEnabled,
    allGroupsEnabled,
    setAllGroupsEnabled,
    pendingUpdates,
  };
}

export type ApplicationAutoApproveSettings = ReturnType<
  typeof useApplicationAutoApproveSettings
>;

export function ApplicationAutoApproveSettings({
  loading,
  autoApprove,
}: {
  loading: boolean;
  autoApprove: ApplicationAutoApproveSettings;
}) {
  const {
    sortedGroups,
    isGroupEnabled,
    setGroupEnabled,
    allGroupsEnabled,
    setAllGroupsEnabled,
  } = autoApprove;

  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-content-emphasis text-sm font-medium leading-5 tracking-[-0.02em]">
          Auto-approval settings
        </h4>
        <p className="text-xs font-normal leading-4 tracking-[-0.02em] text-neutral-500">
          The auto-approval setting is configurable at the group level.
        </p>
      </div>

      <label className="flex w-fit cursor-pointer select-none items-center gap-3 py-1">
        <Switch
          checked={allGroupsEnabled}
          fn={setAllGroupsEnabled}
          disabled={loading}
        />
        <span className="text-sm font-medium leading-5 tracking-[-0.02em] text-neutral-800">
          Enable auto-approve for all groups
        </span>
      </label>

      <AnimatedSizeContainer height>
        {allGroupsEnabled ? (
          <div className="flex h-11 items-center justify-between gap-4 rounded-lg border border-neutral-200 bg-white px-4">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex -space-x-1">
                {sortedGroups.slice(0, 3).map((group) => (
                  <div
                    key={group.id}
                    className="rounded-full ring-2 ring-white"
                  >
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

            <StatusBadge
              variant="success"
              icon={null}
              className="px-1.5 py-0.5"
            >
              Auto-approve enabled
            </StatusBadge>
          </div>
        ) : (
          <AutoApproveGroupsTable
            groups={sortedGroups}
            loading={loading}
            isGroupEnabled={isGroupEnabled}
            onGroupEnabledChange={setGroupEnabled}
          />
        )}
      </AnimatedSizeContainer>
    </div>
  );
}

function AutoApproveGroupsTable({
  groups,
  loading,
  isGroupEnabled,
  onGroupEnabledChange,
}: {
  groups: AutoApproveGroup[];
  loading: boolean;
  isGroupEnabled: (group: AutoApproveGroup) => boolean;
  onGroupEnabledChange: (group: AutoApproveGroup, enabled: boolean) => void;
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
                  <div className="h-4 w-8 animate-pulse rounded-md bg-neutral-200" />
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
                    checked={isGroupEnabled(group)}
                    fn={(checked) => onGroupEnabledChange(group, checked)}
                  />
                </div>
              ))}
        </div>
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-white to-transparent"
        style={{ opacity: fades.top }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white to-transparent"
        style={{ opacity: fades.bottom }}
      />
    </div>
  );
}
