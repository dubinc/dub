"use client";

import { FOLDER_WORKSPACE_ACCESS } from "@/lib/link-folder/constants";
import { FolderProps } from "@/lib/link-folder/types";
import useUsers from "@/lib/swr/use-users";
import useWorkspace from "@/lib/swr/use-workspace";
import { WorkspaceUserProps } from "@/lib/types";
import { Avatar, Globe } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { FolderUserRole } from "@prisma/client";
import { ChevronLeft, FolderIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";

export const FolderUsersPageClient = ({ folderId }: { folderId: string }) => {
  const { users } = useUsers();
  const [isUpdating, setIsUpdating] = useState(false);
  const { id: workspaceId, slug: workspaceSlug } = useWorkspace();
  const [workspaceAccessLevel, setWorkspaceAccessLevel] = useState<string>();

  const { data: folder, isLoading } = useSWR<FolderProps>(
    `/api/folders/${folderId}?workspaceId=${workspaceId}`,
    fetcher,
  );

  if (!isLoading && !folder) {
    notFound();
  }

  const updateWorkspaceAccessLevel = async (accessLevel: string) => {
    setIsUpdating(true);
    setWorkspaceAccessLevel(accessLevel);

    const response = await fetch(
      `/api/folders/${folderId}?workspaceId=${workspaceId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessLevel }),
      },
    );

    setIsUpdating(false);

    if (!response.ok) {
      const error = await response.json();
      toast.error(error.message);
      return;
    }

    toast.success("Workspace access updated!");
    await mutate(`/api/folders/${folderId}?workspaceId=${workspaceId}`);
  };

  return (
    <>
      <Link
        href={`/${workspaceSlug}/settings/folders`}
        className="flex items-center gap-x-1"
      >
        <ChevronLeft className="size-4" />
        <p className="text-sm font-medium text-gray-500">Folders</p>
      </Link>

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b px-5 py-6 sm:flex-row sm:space-y-0">
          {folder ? (
            <>
              <div className="flex items-center gap-x-4">
                <div className="rounded-full bg-green-200 p-0.5 sm:block">
                  <div className="rounded-full border-2 border-white p-2 sm:p-2.5">
                    <FolderIcon className="size-3" />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-semibold leading-none text-gray-900">
                    {folder.name}
                  </span>
                  <div className="flex items-center gap-1">
                    <Globe className="size-3.5 text-gray-500" />
                    <span className="text-[13px] font-normal leading-[14.30px] text-gray-500">
                      100 links
                    </span>
                  </div>
                </div>
              </div>

              <select
                className="rounded-md border border-gray-200 text-xs text-gray-900 focus:border-gray-600 focus:ring-gray-600"
                value={workspaceAccessLevel || folder?.accessLevel || ""}
                disabled={isUpdating}
                onChange={(e) => {
                  updateWorkspaceAccessLevel(e.target.value);
                }}
              >
                {Object.values(FOLDER_WORKSPACE_ACCESS).map((access) => (
                  <option value={access} key={access}>
                    {FOLDER_WORKSPACE_ACCESS[access]}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <FolderPlaceholder />
          )}
        </div>

        <div className="grid divide-y divide-gray-200">
          {users
            ? users.map((user) => <UserCard key={user.id} user={user} />)
            : Array.from({ length: 5 }).map((_, i) => (
                <UserPlaceholder key={i} />
              ))}
        </div>
      </div>
    </>
  );
};

const UserCard = ({ user }: { user: WorkspaceUserProps }) => {
  const [role, setRole] = useState<FolderUserRole | "">("");

  return (
    <div
      key={user.id}
      className="flex items-center justify-between space-x-3 px-5 py-3"
    >
      <div className="flex items-start space-x-3">
        <div className="flex items-center space-x-3">
          <Avatar user={user} />
          <div className="flex flex-col">
            <h3 className="text-xs font-medium text-gray-800">
              {user.name || user.email}
            </h3>
            <p className="text-xs font-normal text-gray-400">{user.email}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-x-3">
        <select
          className="rounded-md border border-gray-200 text-xs text-gray-900 focus:border-gray-600 focus:ring-gray-600"
          value={role}
          onChange={(e) => {
            setRole(e.target.value as FolderUserRole);
          }}
        >
          <option value="">No access</option>
          <option value="owner">Owner</option>
          <option value="editor">Editor</option>
          <option value="viewer">Viewer</option>
        </select>
      </div>
    </div>
  );
};

const FolderPlaceholder = () => (
  <>
    <div className="flex items-center gap-x-4">
      <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200" />
      <div className="flex flex-col gap-2">
        <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
        <div className="flex items-center gap-1">
          <div className="h-3.5 w-3.5 animate-pulse rounded bg-gray-200" />
          <div className="h-3 w-24 animate-pulse rounded bg-gray-200" />
        </div>
      </div>
    </div>
    <div className="h-6 w-24 animate-pulse rounded bg-gray-200" />
  </>
);

const UserPlaceholder = () => (
  <div className="flex items-center justify-between space-x-3 px-5 py-3">
    <div className="flex items-center space-x-3">
      <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200" />
      <div className="flex flex-col">
        <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
        <div className="mt-1 h-3 w-32 animate-pulse rounded bg-gray-200" />
      </div>
    </div>
    <div className="h-3 w-24 animate-pulse rounded bg-gray-200" />
  </div>
);
