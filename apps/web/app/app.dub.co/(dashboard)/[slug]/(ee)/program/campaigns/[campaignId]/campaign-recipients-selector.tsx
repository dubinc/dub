"use client";

import useGroups from "@/lib/swr/use-groups";
import { usePartnerTags } from "@/lib/swr/use-partner-tags";
import { GroupColorCircle } from "@/ui/partners/groups/group-color-circle";
import { GroupsMultiSelect } from "@/ui/partners/groups/groups-multi-select";
import { TagsMultiSelect } from "@/ui/partners/tags-multi-select";
import { Popover, Tag as TagIcon } from "@dub/ui";
import { Users6 } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { ReactNode, useState } from "react";

const MAX_DISPLAYED = 1;

export function CampaignGroupsSelector({
  selectedGroupIds,
  setSelectedGroupIds,
}: {
  selectedGroupIds: string[] | null;
  setSelectedGroupIds: (groupIds: string[] | null) => void;
}) {
  const hasGroupFilter = Boolean(selectedGroupIds?.length);
  const { groups: selectedGroups, loading: groupsLoading } = useGroups({
    query: { groupIds: selectedGroupIds ?? undefined },
    enabled: hasGroupFilter,
  });
  const [openPopover, setOpenPopover] = useState(false);

  const isLoading = groupsLoading && hasGroupFilter;
  const plusCount = Math.max(0, (selectedGroups?.length ?? 0) - MAX_DISPLAYED);

  return (
    <CampaignRecipientPopover
      openPopover={openPopover}
      setOpenPopover={setOpenPopover}
      content={
        <GroupsMultiSelect
          selectedGroupIds={selectedGroupIds}
          setSelectedGroupIds={setSelectedGroupIds}
        />
      }
    >
      {isLoading ? (
        <div className="h-5 w-1/3 animate-pulse rounded bg-neutral-200" />
      ) : !hasGroupFilter ? (
        <RecipientChip openPopover={openPopover}>
          <Users6 className="size-3.5 shrink-0" />
          <span className="text-content-default text-sm font-medium">
            All groups
          </span>
        </RecipientChip>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {selectedGroups?.slice(0, MAX_DISPLAYED).map((group) => (
            <RecipientChip key={group.id} openPopover={openPopover}>
              <GroupColorCircle group={group} />
              <span className="text-content-default min-w-0 truncate text-sm font-medium">
                {group.name}
              </span>
            </RecipientChip>
          ))}

          {plusCount > 0 && (
            <PlusCountBadge count={plusCount} openPopover={openPopover} />
          )}
        </div>
      )}
    </CampaignRecipientPopover>
  );
}

export function CampaignTagsSelector({
  selectedPartnerTagIds,
  setSelectedPartnerTagIds,
}: {
  selectedPartnerTagIds: string[] | null;
  setSelectedPartnerTagIds: (tagIds: string[] | null) => void;
}) {
  const hasTagFilter = Boolean(selectedPartnerTagIds?.length);
  const { partnerTags: selectedTags, isLoading: tagsLoading } = usePartnerTags({
    query: { ids: selectedPartnerTagIds ?? undefined },
    enabled: hasTagFilter,
  });
  const [openPopover, setOpenPopover] = useState(false);

  const isLoading = tagsLoading && hasTagFilter;
  const plusCount = Math.max(0, (selectedTags?.length ?? 0) - MAX_DISPLAYED);

  return (
    <CampaignRecipientPopover
      openPopover={openPopover}
      setOpenPopover={setOpenPopover}
      content={
        <TagsMultiSelect
          selectedPartnerTagIds={selectedPartnerTagIds}
          setSelectedPartnerTagIds={setSelectedPartnerTagIds}
        />
      }
    >
      {isLoading ? (
        <div className="h-5 w-1/3 animate-pulse rounded bg-neutral-200" />
      ) : !hasTagFilter ? (
        <RecipientChip openPopover={openPopover}>
          <TagIcon className="size-3.5 shrink-0" />
          <span className="text-content-default text-sm font-medium">
            All tags
          </span>
        </RecipientChip>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {selectedTags?.slice(0, MAX_DISPLAYED).map((tag) => (
            <RecipientChip key={tag.id} openPopover={openPopover}>
              <TagIcon className="size-3.5 shrink-0" />
              <span className="text-content-default min-w-0 truncate text-sm font-medium">
                {tag.name}
              </span>
            </RecipientChip>
          ))}

          {plusCount > 0 && (
            <PlusCountBadge count={plusCount} openPopover={openPopover} />
          )}
        </div>
      )}
    </CampaignRecipientPopover>
  );
}

function CampaignRecipientPopover({
  openPopover,
  setOpenPopover,
  content,
  children,
}: {
  openPopover: boolean;
  setOpenPopover: (open: boolean) => void;
  content: ReactNode;
  children: ReactNode;
}) {
  return (
    <Popover
      content={<div className="w-full p-3 sm:w-[440px]">{content}</div>}
      align="start"
      openPopover={openPopover}
      setOpenPopover={setOpenPopover}
    >
      <div
        className={cn(
          "group relative flex h-8 w-full cursor-pointer items-center gap-2 rounded-lg p-1.5 text-sm transition-colors duration-150 hover:bg-neutral-100",
          openPopover && "bg-neutral-100",
        )}
        onClick={() => setOpenPopover(true)}
      >
        {children}

        <button
          type="button"
          className={cn(
            "ml-auto h-5 shrink-0 rounded-md bg-neutral-200 px-2 text-xs font-semibold text-neutral-700 transition-opacity",
            openPopover ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
          onClick={(e) => {
            e.stopPropagation();
            setOpenPopover(true);
          }}
        >
          Edit
        </button>
      </div>
    </Popover>
  );
}

function RecipientChip({
  openPopover,
  children,
}: {
  openPopover: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex h-5 min-w-0 items-center gap-1 rounded-md px-1.5 transition-colors",
        openPopover
          ? "bg-neutral-200"
          : "bg-neutral-100 group-hover:bg-neutral-200",
      )}
    >
      {children}
    </div>
  );
}

function PlusCountBadge({
  count,
  openPopover,
}: {
  count: number;
  openPopover: boolean;
}) {
  return (
    <span
      className={cn(
        "flex items-center rounded-md px-2 py-0.5 text-xs font-medium text-neutral-600 transition-colors",
        openPopover
          ? "bg-neutral-200"
          : "bg-neutral-100 group-hover:bg-neutral-200",
      )}
    >
      +{count}
    </span>
  );
}
