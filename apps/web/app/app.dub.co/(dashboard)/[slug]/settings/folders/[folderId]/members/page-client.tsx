"use client";

import { clientAccessCheck } from "@/lib/api/tokens/permissions";
import useUsers from "@/lib/swr/use-users";
import useWorkspace from "@/lib/swr/use-workspace";
import { WorkspaceUserProps } from "@/lib/types";
import { Avatar, Button } from "@dub/ui";
import { cn } from "@dub/utils";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export const FolderUsersPageClient = () => {
  const { users } = useUsers();
  const { role, slug } = useWorkspace();

  return (
    <>
      <Link
        href={`/${slug}/settings/folders`}
        className="flex items-center gap-x-1"
      >
        <ChevronLeft className="size-4" />
        <p className="text-sm font-medium text-gray-500">Folders</p>
      </Link>

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="flex flex-col items-center justify-between space-y-3 border-b border-gray-200 p-5 sm:flex-row sm:space-y-0 sm:p-10">
          <div className="flex flex-col space-y-3">
            <h2 className="text-xl font-medium">People</h2>
            <p className="text-sm text-gray-500">
              Teammates that have access to this workspace.
            </p>
          </div>
          <div className="flex space-x-2">
            <Button
              text="Invite"
              className="h-9"
              disabledTooltip={
                clientAccessCheck({
                  action: "workspaces.write",
                  role,
                  customPermissionDescription: "invite new teammates",
                }).error || undefined
              }
            />
          </div>
        </div>

        <div className="grid divide-y divide-gray-200">
          {users ? (
            users.length > 0 ? (
              users.map((user) => <UserCard key={user.id} user={user} />)
            ) : (
              <div className="flex flex-col items-center justify-center py-10">
                <img
                  src="https://assets.dub.co/misc/video-park.svg"
                  alt="No invitations sent"
                  width={300}
                  height={300}
                  className="pointer-events-none -my-8"
                />
                <p className="text-sm text-gray-500">No invitations sent</p>
              </div>
            )
          ) : (
            Array.from({ length: 5 }).map((_, i) => <UserPlaceholder key={i} />)
          )}
        </div>
      </div>
    </>
  );
};

const UserCard = ({ user }: { user: WorkspaceUserProps }) => {
  const { role: userRole } = useWorkspace();
  const { id, name, email, role: currentRole, isMachine } = user;
  const [role, setRole] = useState<"owner" | "member" | "viewer">(currentRole);

  const permissionsError = clientAccessCheck({
    action: "workspaces.write",
    role: userRole,
    customPermissionDescription: "edit roles or remove teammates",
  }).error;

  return (
    <div
      key={id}
      className="flex items-center justify-between space-x-3 px-4 py-3 sm:pl-8"
    >
      <div className="flex items-start space-x-3">
        <div className="flex items-center space-x-3">
          <Avatar user={user} />
          <div className="flex flex-col">
            <h3 className="text-sm font-medium">{name || email}</h3>
            <p className="text-xs text-gray-500">{email}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-x-3">
        <select
          className={cn(
            "rounded-md border border-gray-200 text-xs text-gray-500 focus:border-gray-600 focus:ring-gray-600",
            {
              "cursor-not-allowed bg-gray-100": permissionsError,
            },
          )}
          value={role}
          disabled={permissionsError ? true : false}
          onChange={(e) => {
            setRole(e.target.value as "owner" | "member" | "viewer");
          }}
        >
          <option value="owner">Owner</option>
          <option value="editor">Editor</option>
          <option value="viewer">Viewer</option>
        </select>
      </div>
    </div>
  );
};

const UserPlaceholder = () => (
  <div className="flex items-center justify-between space-x-3 px-4 py-3 sm:px-8">
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
