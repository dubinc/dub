import useGroups from "@/lib/swr/use-groups";
import { GROUPS_MAX_PAGE_SIZE } from "@/lib/zod/schemas/groups";
import { Combobox } from "@dub/ui";
import { cn } from "@dub/utils";
import { useEffect, useMemo, useState } from "react";
import { useDebounce } from "use-debounce";
import { GroupColorCircle } from "./group-color-circle";

interface GroupSelectorProps {
  selectedGroupId: string | null;
  setSelectedGroupId: (groupId: string) => void;
  disabled?: boolean;
}

export function GroupSelector({
  selectedGroupId,
  setSelectedGroupId,
  disabled,
}: GroupSelectorProps) {
  const [search, setSearch] = useState("");
  const [useAsync, setUseAsync] = useState(false);
  const [debouncedSearch] = useDebounce(search, 500);
  const [openPopover, setOpenPopover] = useState(false);

  const { groups, loading } = useGroups({
    query: useAsync ? { search: debouncedSearch } : undefined,
  });

  const { groups: selectedGroups, loading: selectedGroupsLoading } = useGroups({
    query: selectedGroupId ? { groupIds: [selectedGroupId] } : undefined,
  });

  // Determine if we should use async loading
  useEffect(
    () =>
      setUseAsync(
        Boolean(groups && !useAsync && groups.length >= GROUPS_MAX_PAGE_SIZE),
      ),
    [groups, useAsync],
  );

  const groupOptions = useMemo(() => {
    return groups?.map((group) => ({
      value: group.id,
      label: group.name,
      icon: <GroupColorCircle group={group} />,
    }));
  }, [groups]);

  const selectedOption = useMemo(() => {
    if (!selectedGroupId) return null;

    const group = [...(groups || []), ...(selectedGroups || [])].find(
      (p) => p.id === selectedGroupId,
    );

    if (!group) return null;

    return {
      value: group.id,
      label: group.name,
      icon: <GroupColorCircle group={group} />,
    };
  }, [groups, selectedGroups, selectedGroupId]);

  return (
    <Combobox
      options={loading ? undefined : groupOptions}
      setSelected={(option) => {
        setSelectedGroupId(option.value);
      }}
      selected={selectedOption}
      icon={selectedGroupsLoading ? null : selectedOption?.icon}
      caret={true}
      placeholder={selectedGroupsLoading ? "" : "Select group"}
      searchPlaceholder="Search groups..."
      onSearchChange={setSearch}
      shouldFilter={!useAsync}
      matchTriggerWidth
      open={openPopover}
      onOpenChange={setOpenPopover}
      buttonProps={{
        disabled,
        className: cn(
          "w-full justify-start border-neutral-300 px-3",
          "data-[state=open]:ring-1 data-[state=open]:ring-neutral-500 data-[state=open]:border-neutral-500",
          "focus:ring-1 focus:ring-neutral-500 focus:border-neutral-500 transition-none",
        ),
      }}
    >
      {selectedGroupsLoading ? (
        <div className="my-0.5 h-5 w-1/3 animate-pulse rounded bg-neutral-200" />
      ) : (
        selectedOption?.label
      )}
    </Combobox>
  );
}
