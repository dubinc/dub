import useGroups from "@/lib/swr/use-groups";
import { GroupProps } from "@/lib/types";
import { GROUPS_MAX_PAGE_SIZE } from "@/lib/zod/schemas/groups";
import { GroupColorCircle } from "@/ui/partners/groups/group-color-circle";
import { Combobox } from "@dub/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDebounce } from "use-debounce";

export type Group = Pick<GroupProps, "id" | "slug" | "name" | "color">;

interface GroupSelectorProps {
  selectedGroup: Group | null;
  setSelectedGroup: (group: Group) => void;
  disabled?: boolean;
}

export function GroupHeaderSelector({
  selectedGroup,
  setSelectedGroup,
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
    query: selectedGroup ? { groupIds: [selectedGroup.id] } : undefined,
  });

  // Determine if we should use async loading
  useEffect(
    () =>
      setUseAsync(
        Boolean(groups && !useAsync && groups.length >= GROUPS_MAX_PAGE_SIZE),
      ),
    [groups, useAsync],
  );

  const getGroupById = useCallback(
    (groupId: string) => {
      return (
        groups?.find((group) => group.id === groupId) ??
        selectedGroups?.find((group) => group.id === groupId)
      );
    },
    [groups, selectedGroups],
  );

  const groupOptions = useMemo(() => {
    if (!groups && selectedGroup) {
      return [
        {
          value: selectedGroup.id,
          label: selectedGroup.name,
          icon: <GroupColorCircle group={selectedGroup} />,
        },
      ];
    }

    return groups?.map((group) => ({
      value: group.id,
      label: group.name,
      icon: <GroupColorCircle group={group} />,
    }));
  }, [groups, selectedGroup]);

  const selectedOption = useMemo(() => {
    if (!selectedGroup) return null;

    return {
      value: selectedGroup.id,
      label: selectedGroup.name,
      icon: <GroupColorCircle group={selectedGroup} />,
    };
  }, [selectedGroup]);

  let label;

  if (selectedOption?.label) {
    label = selectedOption?.label;
  } else if (loading) {
    label = (
      <div className="my-0.5 h-5 w-1/3 animate-pulse rounded bg-neutral-200" />
    );
  }

  const onChange = useCallback(
    (option: { value: string }) => {
      if (!option) {
        return;
      }

      console.log(`Selected option: ${option.value}`);

      const group = getGroupById(option.value);

      console.log(`Selected group: ${group}`);
      if (!group) {
        return;
      }

      setSelectedGroup(group);
    },
    [setSelectedGroup, getGroupById],
  );

  return (
    <Combobox
      options={groupOptions}
      setSelected={(option) => onChange(option)}
      selected={selectedOption}
      icon={selectedOption?.icon}
      caret={true}
      placeholder={selectedGroupsLoading ? "" : "Select group"}
      searchPlaceholder="Search groups..."
      onSearchChange={setSearch}
      shouldFilter={!useAsync}
      matchTriggerWidth
      open={openPopover}
      onOpenChange={setOpenPopover}
      popoverProps={{
        contentClassName: "min-w-[280px]",
      }}
      labelProps={{
        className: "text-lg font-semibold leading-7 text-neutral-900",
      }}
      iconProps={{
        className: "size-6",
      }}
      buttonProps={{
        disabled,
        className:
          "w-full justify-start px-3 transition-none max-md:bg-bg-subtle hover:bg-bg-emphasis md:hover:bg-neutral-50 border-none",
      }}
    >
      {label}
    </Combobox>
  );
}
