"use client";

import useGroups from "@/lib/swr/use-groups";
import { GroupColorCircle } from "@/ui/partners/groups/group-color-circle";
import { GroupsMultiSelect } from "@/ui/partners/groups/groups-multi-select";
import { Popover, Users6 } from "@dub/ui";
import { cn } from "@dub/utils";
import { useMemo, useState } from "react";

const MAX_DISPLAYED_GROUPS = 4;

interface CampaignGroupsSelectorProps {
  selectedGroupIds: string[] | null;
  setSelectedGroupIds: (groupIds: string[] | null) => void;
}

export function CampaignGroupsSelector({
  selectedGroupIds,
  setSelectedGroupIds,
}: CampaignGroupsSelectorProps) {
  const { groups, loading } = useGroups();
  const [isHovered, setIsHovered] = useState(false);
  const [openPopover, setOpenPopover] = useState(false);

  const selectedGroups = useMemo(() => {
    if (!selectedGroupIds?.length || !groups) {
      return null;
    }

    return groups.filter((group) => selectedGroupIds.includes(group.id));
  }, [groups, selectedGroupIds]);

  const displayAllGroups = !selectedGroupIds || selectedGroupIds.length === 0;

  const plusCount = selectedGroups
    ? Math.max(0, selectedGroups.length - MAX_DISPLAYED_GROUPS)
    : 0;

  return (
    <Popover
      content={
        <div className="min-w-[440px] p-3">
          <GroupsMultiSelect
            selectedGroupIds={selectedGroupIds}
            setSelectedGroupIds={setSelectedGroupIds}
          />
        </div>
      }
      align="start"
      openPopover={openPopover}
      setOpenPopover={setOpenPopover}
    >
      <div
        className={cn(
          "group relative flex min-h-[28px] w-full cursor-pointer items-center gap-2 rounded-lg p-1.5 text-sm transition-colors duration-150 hover:bg-neutral-100",
          openPopover && "bg-neutral-100",
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => setOpenPopover(true)}
      >
        {loading && selectedGroupIds?.length ? (
          <div className="h-5 w-1/3 animate-pulse rounded bg-neutral-200" />
        ) : displayAllGroups ? (
          <div className="text-content-default flex items-center gap-1.5">
            <Users6 className="size-3.5 shrink-0" />
            <span>All groups</span>
          </div>
        ) : selectedGroups && selectedGroups.length > 0 ? (
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            {selectedGroups.slice(0, MAX_DISPLAYED_GROUPS).map((group) => (
              <div
                key={group.id}
                className="flex h-5 min-w-0 items-center gap-1 rounded-md bg-neutral-200 px-1.5"
              >
                <GroupColorCircle group={group} />
                <span className="text-content-default min-w-0 truncate text-sm font-medium">
                  {group.name}
                </span>
              </div>
            ))}

            {plusCount > 0 && (
              <span className="flex items-center rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
                +{plusCount}
              </span>
            )}
          </div>
        ) : null}

        {(isHovered || openPopover) && (
          <button
            type="button"
            className="ml-auto h-5 shrink-0 rounded-md bg-neutral-200 px-2 text-xs font-semibold text-neutral-700 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setOpenPopover(true);
            }}
          >
            Edit
          </button>
        )}
      </div>
    </Popover>
  );
}
