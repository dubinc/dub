import { updateUserRoleInFolder } from "@/lib/actions/folders/update-folder-user-role";
import {
  FOLDER_USER_ROLE,
  FOLDER_WORKSPACE_ACCESS,
} from "@/lib/folder/constants";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import {
  useCheckFolderPermission,
  useFolderPermissions,
} from "@/lib/swr/use-folder-permissions";
import { useFolderUsers } from "@/lib/swr/use-folder-users";
import useWorkspace from "@/lib/swr/use-workspace";
import { Folder, FolderUser } from "@/lib/types";
import { FolderUserRole, WorkspaceRole } from "@dub/prisma/client";
import {
  Avatar,
  BlurImage,
  Button,
  DynamicTooltipWrapper,
  Sheet,
  Tooltip,
  TooltipContent,
} from "@dub/ui";
import { UserCheck } from "@dub/ui/icons";
import { cn, OG_AVATAR_URL } from "@dub/utils";
import { useSession } from "next-auth/react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { mutate } from "swr";
import { AnimatedEmptyState } from "../shared/animated-empty-state";
import { X } from "../shared/icons";
import { EditFolderForm } from "./edit-folder-form";

interface EditFolderPanelProps {
  showPanel: boolean;
  setShowPanel: (showPanel: boolean) => void;
  folder: Pick<Folder, "id" | "name" | "description" | "accessLevel">;
  onSuccess?: () => void;
}

const EditFolderPanelContent = ({
  showPanel,
  folder,
}: EditFolderPanelProps) => {
  const { id: workspaceId, slug, logo, name, plan } = useWorkspace();

  const [isUpdating, setIsUpdating] = useState(false);
  const [workspaceAccessLevel, setWorkspaceAccessLevel] = useState<string>();

  const { isLoading: isLoadingPermissions } = useFolderPermissions();
  const canUpdateFolder = useCheckFolderPermission(folder.id, "folders.write");

  const { canManageFolderPermissions } = getPlanCapabilities(plan);

  const {
    users,
    isLoading: isUsersLoading,
    isValidating: isUsersValidating,
  } = useFolderUsers({ folderId: folder.id, enabled: showPanel });

  const updateWorkspaceAccessLevel = async (accessLevel: string) => {
    setIsUpdating(true);
    setWorkspaceAccessLevel(accessLevel);

    const response = await fetch(
      `/api/folders/${folder.id}?workspaceId=${workspaceId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessLevel: accessLevel === "" ? null : accessLevel,
        }),
      },
    );

    setIsUpdating(false);

    if (!response.ok) {
      const { error } = await response.json();
      toast.error(error.message);
      return;
    }

    toast.success("Workspace access updated!");
    await mutate(
      (key) => typeof key === "string" && key.startsWith(`/api/folders`),
    );
  };

  const selectDropdown = (
    <select
      className={cn(
        "appearance-none rounded-md border border-neutral-200 bg-white pl-3 pr-8 text-sm text-neutral-900 focus:border-neutral-300 focus:ring-neutral-300",
        !canUpdateFolder && "cursor-not-allowed bg-neutral-100",
      )}
      value={workspaceAccessLevel || folder?.accessLevel || ""}
      disabled={
        isUpdating ||
        isLoadingPermissions ||
        !canUpdateFolder ||
        !canManageFolderPermissions
      }
      onChange={(e) => updateWorkspaceAccessLevel(e.target.value)}
    >
      {Object.keys(FOLDER_WORKSPACE_ACCESS).map((access) => (
        <option value={access} key={access}>
          {FOLDER_WORKSPACE_ACCESS[access]}
        </option>
      ))}
      <option value="" key="no-access">
        No access
      </option>
    </select>
  );

  return (
    <>
      <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white">
        <div className="flex h-16 items-center justify-between px-6 py-4">
          <Sheet.Title className="text-lg font-semibold">
            Edit folder
          </Sheet.Title>
          <Sheet.Close asChild>
            <Button
              variant="outline"
              icon={<X className="size-5" />}
              className="h-auto w-fit p-1"
            />
          </Sheet.Close>
        </div>
      </div>
      <div className="scrollbar-hide flex size-full grow flex-col overflow-y-auto bg-zinc-50">
        <div className="bg-white px-8 py-6">
          <EditFolderForm folder={folder} />
        </div>
        <div className="border-border-subtle border-t px-8 py-6">
          {/* Workspace-level access */}
          <div>
            <span className="text-sm font-medium text-neutral-900">
              Workspace
            </span>
            <div className="relative mt-3 flex items-center justify-between gap-4">
              <div className="flex min-w-12 items-center gap-2">
                <BlurImage
                  src={logo || `${OG_AVATAR_URL}${name}`}
                  alt={name || "Workspace logo"}
                  className="size-8 shrink-0 overflow-hidden rounded-full"
                  width={32}
                  height={32}
                />
                <span className="truncate whitespace-nowrap text-sm text-neutral-800">
                  {name}
                </span>
              </div>

              {canManageFolderPermissions ? (
                selectDropdown
              ) : (
                <Tooltip
                  content={
                    <TooltipContent
                      title="You can only set custom folder permissions on a Business plan and above."
                      cta="Upgrade to Business"
                      href={`/${slug}/upgrade`}
                      target="_blank"
                    />
                  }
                  align="end"
                >
                  {selectDropdown}
                </Tooltip>
              )}
            </div>
          </div>

          {/* Users */}
          <div className="mt-4">
            <span className="text-sm font-medium text-neutral-900">
              Folder Users
            </span>
            {!canManageFolderPermissions ? (
              <AnimatedEmptyState
                title="Folder permissions"
                description="Add and manage users permissions to this folder"
                cardContent={
                  <>
                    <UserCheck className="size-4 text-neutral-700" />
                    <div className="h-2.5 w-28 min-w-0 rounded-sm bg-neutral-200" />
                  </>
                }
                className="border-none"
                learnMoreHref={`/${slug}/upgrade`}
                learnMoreText="Upgrade to Business"
              />
            ) : (
              <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-3">
                {isUsersValidating || isUsersLoading || false
                  ? [...Array(3)].map((_, i) => (
                      <FolderUserPlaceholder key={i} />
                    ))
                  : folder &&
                    users?.map((user) => (
                      <FolderUserRow
                        key={user.id}
                        user={user}
                        folder={folder}
                      />
                    ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

const EditFolderPanel = (props: EditFolderPanelProps) => {
  return (
    <Sheet open={props.showPanel} onOpenChange={props.setShowPanel}>
      <EditFolderPanelContent {...props} />
    </Sheet>
  );
};

const FolderUserRow = ({
  user,
  folder,
}: {
  user: FolderUser;
  folder: Pick<Folder, "id" | "name" | "accessLevel">;
}) => {
  const { data: session } = useSession();
  const { id: workspaceId } = useWorkspace();
  const [role, setRole] = useState<FolderUserRole>(user.role);

  const canUpdateRole = useCheckFolderPermission(
    folder.id,
    "folders.users.write",
  );

  const { executeAsync, isPending } = useAction(updateUserRoleInFolder, {
    onSuccess: () => {
      toast.success("Role updated!");
    },
    onError: ({ error }) => {
      toast.error(error.serverError);
    },
  });

  const isWorkspaceOwner = user.workspaceRole === WorkspaceRole.owner;
  const isCurrentUser = user.email === session?.user?.email;
  const disableRoleUpdate =
    !canUpdateRole || isPending || isCurrentUser || isWorkspaceOwner;

  return (
    <div key={user.id} className="flex items-center justify-between gap-3">
      <div className="flex min-w-12 items-center gap-3">
        <Avatar user={user} className="size-8" />
        <div className="min-w-0">
          <h3 className="truncate text-xs font-medium text-neutral-800">
            {user.name || user.email}
          </h3>
          <p className="truncate text-xs font-normal text-neutral-400">
            {user.email}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <DynamicTooltipWrapper
          tooltipProps={
            isWorkspaceOwner && !isCurrentUser
              ? { content: "Workspace owners have full access to all folders." }
              : undefined
          }
        >
          <select
            className={cn(
              "cursor-pointer appearance-none rounded-md border border-neutral-200 bg-white pl-3 pr-8 text-sm text-neutral-900 focus:border-neutral-300 focus:ring-neutral-300",
              disableRoleUpdate && "cursor-not-allowed bg-neutral-100",
            )}
            value={role === null ? "" : role}
            disabled={disableRoleUpdate}
            onChange={(e) => {
              if (!folder || !workspaceId) {
                return;
              }

              const role = (e.target.value as FolderUserRole) || null;

              executeAsync({
                workspaceId,
                folderId: folder.id,
                userId: user.id,
                role,
              });

              setRole(role);
            }}
          >
            {Object.keys(FOLDER_USER_ROLE).map((role) => (
              <option value={role} key={role}>
                {FOLDER_USER_ROLE[role]}
              </option>
            ))}

            <option value="" key="no-access">
              No access
            </option>
          </select>
        </DynamicTooltipWrapper>
      </div>
    </div>
  );
};

const FolderUserPlaceholder = () => (
  <div className="flex items-center justify-between gap-3">
    <div className="flex items-center gap-3">
      <div className="size-8 animate-pulse rounded-full bg-neutral-200" />
      <div className="flex flex-col">
        <div className="h-4 w-24 animate-pulse rounded bg-neutral-200" />
        <div className="mt-1 h-3 w-32 animate-pulse rounded bg-neutral-200" />
      </div>
    </div>
    <div className="my-px h-9 w-24 animate-pulse rounded bg-neutral-200" />
  </div>
);

export function useEditFolderPanel(
  folder: Pick<Folder, "id" | "name" | "description" | "accessLevel">,
) {
  const [showEditFolderPanel, setShowEditFolderPanel] = useState(false);

  return {
    setShowEditFolderPanel,
    editFolderPanel: (
      <EditFolderPanel
        showPanel={showEditFolderPanel}
        setShowPanel={setShowEditFolderPanel}
        folder={folder}
      />
    ),
  };
}
