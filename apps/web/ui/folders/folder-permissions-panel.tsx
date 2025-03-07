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
import useWorkspace from "@/lib/swr/use-workspace";
import { Folder, FolderUser } from "@/lib/types";
import { FolderUserRole } from "@dub/prisma/client";
import { Avatar, BlurImage, Button, Tooltip, TooltipContent } from "@dub/ui";
import { Globe, UserCheck } from "@dub/ui/icons";
import { cn, DICEBEAR_AVATAR_URL, fetcher, nFormatter } from "@dub/utils";
import { useSession } from "next-auth/react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";
import { Drawer } from "vaul";
import { AnimatedEmptyState } from "../shared/animated-empty-state";
import { X } from "../shared/icons";
import { FolderIcon } from "./folder-icon";
import { RequestFolderEditAccessButton } from "./request-edit-button";

// TODO
// Use the new `<Sheet />` component

interface FolderPermissionsPanelProps {
  showPanel: boolean;
  setShowPanel: (showPanel: boolean) => void;
  folder: Pick<Folder, "id" | "name" | "accessLevel" | "linkCount">;
  onSuccess?: () => void;
}

const FolderPermissionsPanel = ({
  showPanel,
  setShowPanel,
  folder,
}: FolderPermissionsPanelProps) => {
  const { id: workspaceId, slug, logo, name, plan } = useWorkspace();

  const [isUpdating, setIsUpdating] = useState(false);
  const [workspaceAccessLevel, setWorkspaceAccessLevel] = useState<string>();

  const { isLoading: isLoadingPermissions } = useFolderPermissions();
  const canUpdateFolder = useCheckFolderPermission(folder.id, "folders.write");
  const canCreateLinks = useCheckFolderPermission(
    folder.id,
    "folders.links.write",
  );

  const { canManageFolderPermissions } = getPlanCapabilities(plan);

  const {
    data: users,
    isLoading: isUsersLoading,
    isValidating: isUsersValidating,
  } = useSWR<FolderUser[]>(
    showPanel && canManageFolderPermissions
      ? `/api/folders/${folder.id}/users?workspaceId=${workspaceId}`
      : undefined,
    fetcher,
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
    },
  );

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
    <Drawer.Root open={showPanel} onOpenChange={setShowPanel} direction="right">
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/20" />
        <Drawer.Content
          className="fixed bottom-2 right-2 top-2 z-10 flex w-[calc(100%-16px)] outline-none md:w-[540px]"
          style={
            // 8px between edge of screen and drawer
            { "--initial-transform": "calc(100% + 8px)" } as React.CSSProperties
          }
        >
          <div className="scrollbar-hide flex size-full grow flex-col overflow-y-auto rounded-lg bg-zinc-50">
            <div className="flex items-center justify-between border-b border-neutral-200 px-8 py-5">
              <Drawer.Title className="text-xl font-medium text-zinc-900">
                Folder permissions
              </Drawer.Title>
              <Drawer.Description className="sr-only">
                Configure permissions for the "{folder.name}" folder
              </Drawer.Description>
              <Drawer.Close asChild>
                <Button
                  variant="outline"
                  icon={<X className="size-5" />}
                  className="h-auto w-fit p-1"
                />
              </Drawer.Close>
            </div>
            <div className="px-8 py-6">
              <div className="flex flex-col justify-between rounded-xl border border-neutral-200 bg-white px-5 py-4 sm:h-36">
                <div className="flex items-start justify-between">
                  <FolderIcon folder={folder} />
                  {!isLoadingPermissions && !canCreateLinks && (
                    <RequestFolderEditAccessButton
                      folderId={folder.id}
                      workspaceId={workspaceId!}
                    />
                  )}
                </div>
                <div>
                  <span className="flex items-center justify-start gap-1.5 text-sm font-medium text-neutral-900">
                    <span className="truncate">{folder.name}</span>
                    {folder.id === "unsorted" && (
                      <div className="rounded bg-neutral-100 p-1">
                        <div className="text-xs font-normal text-black">
                          Unsorted
                        </div>
                      </div>
                    )}
                  </span>

                  <div className="mt-1.5 flex items-center gap-1 text-neutral-500">
                    <Globe className="size-3.5" />
                    <span className="text-sm font-normal">
                      {nFormatter(folder.linkCount)} link
                      {folder.linkCount !== 1 && "s"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Workspace-level access */}
              <div className="mt-6">
                <span className="text-sm font-medium text-neutral-900">
                  Workspace
                </span>
                <div className="relative mt-3 flex items-center justify-between gap-4">
                  <div className="flex min-w-12 items-center gap-2">
                    <BlurImage
                      src={logo || `${DICEBEAR_AVATAR_URL}${name}`}
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
                          href={`/${slug}/upgrade?exit=close`}
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
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};

const FolderUserRow = ({
  user,
  folder,
}: {
  user: FolderUser;
  folder: Pick<Folder, "id" | "name" | "accessLevel" | "linkCount">;
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

  const isCurrentUser = user.email === session?.user?.email;
  const disableRoleUpdate = !canUpdateRole || isPending || isCurrentUser;

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

export function useFolderPermissionsPanel(
  folder: Pick<Folder, "id" | "name" | "accessLevel" | "linkCount">,
) {
  const [showFolderPermissionsPanel, setShowFolderPermissionsPanel] =
    useState(false);

  return {
    setShowFolderPermissionsPanel,
    folderPermissionsPanel: (
      <FolderPermissionsPanel
        showPanel={showFolderPermissionsPanel}
        setShowPanel={setShowFolderPermissionsPanel}
        folder={folder}
      />
    ),
  };
}
