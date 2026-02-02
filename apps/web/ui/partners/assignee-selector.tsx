import useWorkspaceUsers from "@/lib/swr/use-workspace-users";
import { WorkspaceUserProps } from "@/lib/types";
import { Combobox } from "@dub/ui";
import { CircleDottedUser } from "@dub/ui/icons";
import { cn, OG_AVATAR_URL } from "@dub/utils";
import { useMemo, useState } from "react";

type AssigneeSelectorProps = {
  /** undefined = nothing selected (show placeholder), null = "No assignee", string = user ID */
  selectedManagerUserId: string | null | undefined;
  setSelectedManagerUserId: (userId: string | null) => void;
  /** The currently persisted manager user (for removed member detection) */
  currentManagerUser?: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
  disabled?: boolean;
};

export function AssigneeSelector({
  selectedManagerUserId,
  setSelectedManagerUserId,
  currentManagerUser,
  disabled,
}: AssigneeSelectorProps) {
  const [search, setSearch] = useState("");
  const { users, loading } = useWorkspaceUsers();

  const isRemovedMember = useMemo(() => {
    if (!currentManagerUser || !users) return false;
    return !users.some((u) => u.id === currentManagerUser.id);
  }, [currentManagerUser, users]);

  const options = useMemo(() => {
    const noAssigneeOption = {
      value: "__no_assignee__",
      label: "No assignee",
      icon: (
        <CircleDottedUser className="size-4 shrink-0 text-neutral-400" />
      ),
      first: true,
    };

    const memberOptions =
      users
        ?.filter((u) => !u.isMachine)
        .map((user) => ({
          value: user.id,
          label: user.name || user.email || "Unknown",
          icon: (
            <img
              src={user.image || `${OG_AVATAR_URL}${user.name || user.id}`}
              alt={user.name || ""}
              className="size-4 shrink-0 rounded-full"
            />
          ),
        })) || [];

    // If the current manager is a removed member and is currently selected, show them
    if (
      isRemovedMember &&
      currentManagerUser &&
      selectedManagerUserId === currentManagerUser.id
    ) {
      const removedOption = {
        value: currentManagerUser.id,
        label: `${currentManagerUser.name || "Unknown"} (Removed)`,
        icon: (
          <img
            src={
              currentManagerUser.image ||
              `${OG_AVATAR_URL}${currentManagerUser.name || currentManagerUser.id}`
            }
            alt={currentManagerUser.name || ""}
            className="size-4 shrink-0 rounded-full grayscale"
          />
        ),
      };
      return [noAssigneeOption, removedOption, ...memberOptions];
    }

    return [noAssigneeOption, ...memberOptions];
  }, [users, isRemovedMember, currentManagerUser, selectedManagerUserId]);

  const selectedOption = useMemo(() => {
    if (selectedManagerUserId === undefined) {
      return null; // Show placeholder
    }
    if (selectedManagerUserId === null) {
      return options[0]; // "No assignee"
    }
    return options.find((o) => o.value === selectedManagerUserId) || null;
  }, [selectedManagerUserId, options]);

  return (
    <Combobox
      options={loading ? undefined : options}
      setSelected={(option) => {
        if (!option) return;
        setSelectedManagerUserId(
          option.value === "__no_assignee__" ? null : option.value,
        );
      }}
      selected={selectedOption}
      icon={selectedOption?.icon}
      caret={true}
      placeholder="Select assignee"
      searchPlaceholder="Search members..."
      onSearchChange={setSearch}
      matchTriggerWidth
      buttonProps={{
        disabled,
        className: cn(
          "w-full justify-start border-neutral-300 px-3",
          "data-[state=open]:ring-1 data-[state=open]:ring-neutral-500 data-[state=open]:border-neutral-500",
          "focus:ring-1 focus:ring-neutral-500 focus:border-neutral-500 transition-none",
        ),
      }}
    >
      {selectedOption?.label}
    </Combobox>
  );
}
