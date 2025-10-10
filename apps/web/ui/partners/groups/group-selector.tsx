import useGroups from "@/lib/swr/use-groups";
import { GroupProps } from "@/lib/types";
import { GROUPS_MAX_PAGE_SIZE } from "@/lib/zod/schemas/groups";
import { Combobox, ComboboxProps } from "@dub/ui";
import { cn } from "@dub/utils";
import { useEffect, useMemo, useState } from "react";
import { useDebounce } from "use-debounce";
import { GroupColorCircle } from "./group-color-circle";

export type Group = Pick<GroupProps, "id" | "name" | "color">;

type GroupSelectorProps = {
  selectedGroupId: string | null;
  setSelectedGroupId: (groupId: string) => void;
  disabled?: boolean;
  variant?: "default" | "header";
} & Partial<ComboboxProps<false, any>>;

export function GroupSelector({
  selectedGroupId,
  setSelectedGroupId,
  disabled,
  variant = "default",
  ...rest
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

  useEffect(() => {
    if (groups && !useAsync && groups.length >= GROUPS_MAX_PAGE_SIZE) {
      setUseAsync(true);
    }
  }, [groups, useAsync]);

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
        if (!option) return;
        setSelectedGroupId(option.value);
      }}
      selected={selectedOption}
      icon={
        !selectedOption?.icon ? (
          <div className="size-5 flex-none animate-pulse rounded-full bg-neutral-200" />
        ) : (
          selectedOption?.icon
        )
      }
      caret={true}
      placeholder={selectedGroupsLoading ? "" : "Select group"}
      searchPlaceholder="Search groups..."
      onSearchChange={setSearch}
      shouldFilter={!useAsync}
      matchTriggerWidth
      open={openPopover}
      onOpenChange={setOpenPopover}
      {...(variant === "header"
        ? {
            popoverProps: {
              contentClassName: "min-w-[280px]",
            },
            labelProps: {
              className: "text-lg font-semibold leading-7 text-neutral-900",
            },
            iconProps: {
              className: "size-6",
            },
            buttonProps: {
              disabled,
              className:
                "w-full justify-start px-2 py-1 h-8 transition-none max-md:bg-bg-subtle hover:bg-bg-subtle md:hover:bg-subtle border-none rounded-lg",
            },
          }
        : {
            buttonProps: {
              disabled,
              className: cn(
                "w-full justify-start border-neutral-300 px-3",
                "data-[state=open]:ring-1 data-[state=open]:ring-neutral-500 data-[state=open]:border-neutral-500",
                "focus:ring-1 focus:ring-neutral-500 focus:border-neutral-500 transition-none",
              ),
            },
          })}
      {...rest}
    >
      {!selectedOption?.label ? (
        <div className="h-6 w-[120px] animate-pulse rounded bg-neutral-100" />
      ) : (
        selectedOption.label
      )}
    </Combobox>
  );
}
