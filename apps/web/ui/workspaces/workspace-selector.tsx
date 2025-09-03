import useWorkspaces from "@/lib/swr/use-workspaces";
import { Button, Combobox } from "@dub/ui";
import { OG_AVATAR_URL, cn } from "@dub/utils";
import { useMemo, useState } from "react";
import { useAddWorkspaceModal } from "../modals/add-workspace-modal";

interface WorkspaceSelectorProps {
  selectedWorkspace: string;
  setSelectedWorkspace: (workspace: string) => void;
}

export function WorkspaceSelector({
  selectedWorkspace,
  setSelectedWorkspace,
}: WorkspaceSelectorProps) {
  const [openPopover, setOpenPopover] = useState(false);
  const { workspaces, loading } = useWorkspaces();

  const { AddWorkspaceModal, setShowAddWorkspaceModal } =
    useAddWorkspaceModal();

  const workspaceOptions = useMemo(() => {
    return workspaces?.map((workspace) => ({
      value: workspace.slug,
      label: workspace.name,
      icon: (
        <img
          src={workspace.logo || `${OG_AVATAR_URL}${workspace.name}`}
          alt={workspace.name}
          className="size-4 rounded-full"
        />
      ),
    }));
  }, [workspaces]);

  const selectedOption = useMemo(() => {
    if (!selectedWorkspace) {
      return null;
    }

    const workspace = workspaces?.find((w) => w.slug === selectedWorkspace);

    if (!workspace) {
      return null;
    }

    return {
      value: workspace.slug,
      label: workspace.name,
      icon: (
        <img
          src={workspace.logo || `${OG_AVATAR_URL}${workspace.name}`}
          alt={workspace.name}
          className="size-4 rounded-full"
        />
      ),
    };
  }, [workspaces, selectedWorkspace]);

  return (
    <>
      <AddWorkspaceModal />
      <Combobox
        options={loading ? undefined : workspaceOptions}
        setSelected={(option) => {
          setSelectedWorkspace(option.value);
        }}
        selected={selectedOption}
        icon={loading ? null : selectedOption?.icon}
        caret={true}
        placeholder={loading ? "" : "Select workspace"}
        searchPlaceholder="Search workspaces..."
        matchTriggerWidth
        open={openPopover}
        onOpenChange={setOpenPopover}
        buttonProps={{
          className: cn(
            "w-full justify-start border-neutral-300 px-3",
            "data-[state=open]:ring-1 data-[state=open]:ring-neutral-500 data-[state=open]:border-neutral-500",
            "focus:ring-1 focus:ring-neutral-500 focus:border-neutral-500 transition-none",
          ),
        }}
        emptyState={
          <div className="flex w-full flex-col items-center gap-2 py-4">
            No workspaces found
            <Button
              onClick={() => {
                setOpenPopover(false);
                setShowAddWorkspaceModal(true);
              }}
              variant="primary"
              className="h-7 w-fit px-2"
              text="Create new workspace"
            />
          </div>
        }
      >
        {loading ? (
          <div className="flex items-center gap-3">
            <div className="size-4 animate-pulse rounded-full bg-neutral-200" />
            <div className="h-4 w-32 animate-pulse rounded-md bg-neutral-200" />
          </div>
        ) : (
          selectedOption?.label
        )}
      </Combobox>
    </>
  );
}
