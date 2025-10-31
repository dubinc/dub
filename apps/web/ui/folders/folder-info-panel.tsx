import { FOLDER_WORKSPACE_ACCESS } from "@/lib/folder/constants";
import useCurrentFolderId from "@/lib/swr/use-current-folder-id";
import useFolder from "@/lib/swr/use-folder";
import { useFolderUsers } from "@/lib/swr/use-folder-users";
import useWorkspace from "@/lib/swr/use-workspace";
import { FolderUser } from "@/lib/types";
import { Avatar, BlurImage, LoadingSpinner, Tooltip } from "@dub/ui";
import { PropsWithChildren } from "react";
import { FolderActions } from "./folder-actions";

export function FolderInfoPanel() {
  const {
    id: workspaceId,
    logo: workspaceLogo,
    name: workspaceName,
  } = useWorkspace();
  const { folderId } = useCurrentFolderId();
  const { folder } = useFolder({ folderId });

  const { users, isLoading: isLoadingUsers } = useFolderUsers({
    folderId: folderId,
    enabled: !!folder,
  });

  if (!folder)
    return (
      <div className="flex size-full items-center justify-center">
        <LoadingSpinner />
      </div>
    );

  const owners = users?.filter((u) => u.role === "owner");
  const editors = users?.filter((u) => u.role === "editor");
  const viewers = users?.filter((u) => u.role === "viewer");

  return (
    <div className="flex flex-col gap-6">
      {folder.description && (
        <div className="flex flex-col gap-2">
          <SectionHeader>Description</SectionHeader>
          <p className="text-content-subtle whitespace-pre-wrap text-sm">
            {folder.description}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <SectionHeader>Workspace</SectionHeader>
        <div className="flex items-center gap-3">
          <BlurImage
            src={workspaceLogo || `https://avatar.vercel.sh/${workspaceId}`}
            referrerPolicy="no-referrer"
            width={36}
            height={36}
            alt={`${workspaceName} logo`}
            className="size-9 shrink-0 overflow-hidden rounded-full"
            draggable={false}
          />
          <div>
            <span className="text-content-emphasis min-w-0 truncate text-sm font-semibold">
              {workspaceName}
            </span>
            <div className="text-content-default bg-bg-emphasis w-fit rounded-md px-1 text-xs font-semibold">
              {folder.accessLevel
                ? FOLDER_WORKSPACE_ACCESS[folder.accessLevel]
                : "No access"}
            </div>
          </div>
        </div>
      </div>

      {Boolean(isLoadingUsers || owners?.length) && (
        <div className="flex flex-col gap-2">
          <SectionHeader>Owner</SectionHeader>
          <div className="flex flex-wrap items-center gap-3">
            <UserList users={owners} />
          </div>
        </div>
      )}

      {Boolean(isLoadingUsers || editors?.length) && (
        <div className="flex flex-col gap-2">
          <SectionHeader>Editor</SectionHeader>
          <div className="flex flex-wrap items-center gap-3">
            <UserList users={editors} />
          </div>
        </div>
      )}

      {Boolean(isLoadingUsers || viewers?.length) && (
        <div className="flex flex-col gap-2">
          <SectionHeader>Viewer</SectionHeader>
          <div className="flex flex-wrap items-center gap-3">
            <UserList users={viewers} />
          </div>
        </div>
      )}
    </div>
  );
}

const SectionHeader = ({ children }: PropsWithChildren) => (
  <h3 className="text-content-default text-sm font-semibold">{children}</h3>
);

const UserList = ({ users }: { users?: FolderUser[] }) => (
  <div className="flex flex-wrap items-center gap-3">
    {users
      ? users.map((user) => (
          <Tooltip
            key={user.id}
            content={
              <div className="w-full p-3">
                <Avatar user={user} className="size-8" />
                <div className="mt-2 flex items-center gap-1.5">
                  <p className="text-sm font-semibold text-neutral-700">
                    {user?.name || user?.email || "Anonymous User"}
                  </p>
                </div>
                <div className="flex flex-col gap-1 text-xs text-neutral-500">
                  {user?.name && user.email && <p>{user.email}</p>}
                </div>
              </div>
            }
            delayDuration={150}
          >
            <div>
              <Avatar user={user} className="size-9 border-none" />
            </div>
          </Tooltip>
        ))
      : [...Array(3)].map((_, index) => (
          <div
            key={index}
            className="size-9 shrink-0 animate-pulse overflow-hidden rounded-full bg-neutral-200"
          />
        ))}
  </div>
);

export function FolderInfoPanelControls() {
  const { folderId } = useCurrentFolderId();
  const { folder } = useFolder({ folderId });

  if (!folder) return null;

  return <FolderActions folder={folder} className="border-subtle border" />;
}
