"use client";

import { clientAccessCheck } from "@/lib/api/tokens/permissions";
import useUsers from "@/lib/swr/use-users";
import useWorkspace from "@/lib/swr/use-workspace";
import { WorkspaceUserProps } from "@/lib/types";
import { useEditRoleModal } from "@/ui/modals/edit-role-modal";
import { useInviteCodeModal } from "@/ui/modals/invite-code-modal";
import { useInviteTeammateModal } from "@/ui/modals/invite-teammate-modal";
import { useRemoveTeammateModal } from "@/ui/modals/remove-teammate-modal";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import {
  CheckCircleFill,
  Link as LinkIcon,
  ThreeDots,
} from "@/ui/shared/icons";
import {
  Avatar,
  Badge,
  Button,
  Copy,
  IconMenu,
  Popover,
  useCopyToClipboard,
  UserCheck,
} from "@dub/ui";
import { capitalize, cn, timeAgo } from "@dub/utils";
import { UserMinus } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";

const tabs: Array<"Members" | "Invitations"> = ["Members", "Invitations"];

export default function WorkspacePeopleClient() {
  const { setShowInviteTeammateModal, InviteTeammateModal } =
    useInviteTeammateModal({ showSavedInvites: true });

  const { setShowInviteCodeModal, InviteCodeModal } = useInviteCodeModal();

  const [currentTab, setCurrentTab] = useState<"Members" | "Invitations">(
    "Members",
  );

  const { role } = useWorkspace();

  const { users } = useUsers({ invites: currentTab === "Invitations" });

  return (
    <>
      <InviteTeammateModal />
      <InviteCodeModal />
      <div className="rounded-lg border border-neutral-200 bg-white">
        <div className="flex flex-col items-center justify-between space-y-3 p-5 sm:flex-row sm:space-y-0 sm:p-10">
          <div className="flex flex-col space-y-3">
            <h2 className="text-xl font-medium">People</h2>
            <p className="text-sm text-neutral-500">
              Teammates that have access to this workspace.
            </p>
          </div>
          <div className="flex space-x-2">
            <Button
              text="Invite"
              onClick={() => setShowInviteTeammateModal(true)}
              className="h-9"
              disabledTooltip={
                clientAccessCheck({
                  action: "workspaces.write",
                  role,
                  customPermissionDescription: "invite new teammates",
                }).error || undefined
              }
            />
            <Button
              icon={<LinkIcon className="h-4 w-4 text-neutral-800" />}
              variant="secondary"
              onClick={() => setShowInviteCodeModal(true)}
              className="h-9 space-x-0"
              disabledTooltip={
                clientAccessCheck({
                  action: "workspaces.write",
                  role,
                  customPermissionDescription: "generate invite links",
                }).error || undefined
              }
            />
          </div>
        </div>
        <div className="flex space-x-3 border-b border-neutral-200 px-3 sm:px-7">
          {tabs.map((tab) => (
            <div
              key={tab}
              className={`${
                tab === currentTab ? "border-black" : "border-transparent"
              } border-b py-1`}
            >
              <button
                onClick={() => setCurrentTab(tab)}
                className="rounded-md px-3 py-1.5 text-sm transition-all duration-75 hover:bg-neutral-100 active:bg-neutral-200"
              >
                {tab}
              </button>
            </div>
          ))}
        </div>
        <div className="grid divide-y divide-neutral-200">
          {users ? (
            users.length > 0 ? (
              users.map((user) => (
                <UserCard key={user.id} user={user} currentTab={currentTab} />
              ))
            ) : (
              <AnimatedEmptyState
                title="No invitations sent"
                description="No teammates have been added to this workspace yet."
                cardContent={() => (
                  <>
                    <UserCheck className="size-4 text-neutral-700" />
                    <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
                  </>
                )}
                className="border-none"
              />
            )
          ) : (
            Array.from({ length: 5 }).map((_, i) => <UserPlaceholder key={i} />)
          )}
        </div>
      </div>
    </>
  );
}

const UserCard = ({
  user,
  currentTab,
}: {
  user: WorkspaceUserProps;
  currentTab: "Members" | "Invitations";
}) => {
  const [openPopover, setOpenPopover] = useState(false);

  const { role: userRole } = useWorkspace();

  const permissionsError = clientAccessCheck({
    action: "workspaces.write",
    role: userRole,
    customPermissionDescription: "edit roles or remove teammates",
  }).error;

  const { id, name, email, createdAt, role: currentRole, isMachine } = user;

  const [role, setRole] = useState<"owner" | "member">(currentRole);

  const { EditRoleModal, setShowEditRoleModal } = useEditRoleModal({
    user,
    role,
  });

  const { RemoveTeammateModal, setShowRemoveTeammateModal } =
    useRemoveTeammateModal({ user, invite: currentTab === "Invitations" });

  const { data: session } = useSession();

  // invites expire after 14 days of being sent
  const expiredInvite =
    currentTab === "Invitations" &&
    createdAt &&
    Date.now() - new Date(createdAt).getTime() > 14 * 24 * 60 * 60 * 1000;

  const [copiedUserId, copyToClipboard] = useCopyToClipboard();

  const copyUserId = () => {
    toast.promise(copyToClipboard(id), {
      success: "User ID copied!",
    });
  };

  return (
    <>
      <EditRoleModal />
      <RemoveTeammateModal />
      <div
        key={id}
        className="flex items-center justify-between space-x-3 px-4 py-3 sm:pl-8"
      >
        <div className="flex items-start space-x-3">
          <div className="flex items-center space-x-3">
            <Avatar
              user={{
                ...user,
                id: currentTab === "Invitations" ? user.email : user.id,
              }}
            />
            <div className="flex flex-col">
              <h3 className="text-sm font-medium">{name || email}</h3>
              <p className="text-xs text-neutral-500">{email}</p>
            </div>
          </div>

          {expiredInvite && <Badge variant="gray">Expired</Badge>}
        </div>
        <div className="flex items-center gap-x-3">
          {currentTab === "Members" ? (
            session?.user?.email === email ? (
              <p className="text-xs capitalize text-neutral-500">{role}</p>
            ) : (
              !isMachine && (
                <select
                  className={cn(
                    "rounded-md border border-neutral-200 text-xs text-neutral-500 focus:border-neutral-600 focus:ring-neutral-600",
                    {
                      "cursor-not-allowed bg-neutral-100": permissionsError,
                    },
                  )}
                  value={role}
                  disabled={permissionsError ? true : false}
                  onChange={(e) => {
                    setRole(e.target.value as "owner" | "member");
                    setOpenPopover(false);
                    setShowEditRoleModal(true);
                  }}
                >
                  <option value="owner">Owner</option>
                  <option value="member">Member</option>
                </select>
              )
            )
          ) : (
            <>
              <p
                className="hidden text-xs text-neutral-500 sm:block"
                suppressHydrationWarning
              >
                {capitalize(user.role)}
              </p>
              <p
                className="text-right text-xs text-neutral-500 sm:min-w-28"
                suppressHydrationWarning
              >
                Invited {timeAgo(createdAt)}
              </p>
            </>
          )}

          <Popover
            content={
              <div className="grid w-full gap-1 p-2 sm:w-48">
                <Button
                  text="Copy User ID"
                  variant="outline"
                  onClick={() => copyUserId()}
                  icon={
                    copiedUserId ? (
                      <CheckCircleFill className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )
                  }
                  className="h-9 justify-start px-2 font-medium"
                />
                <button
                  onClick={() => {
                    setOpenPopover(false);
                    setShowRemoveTeammateModal(true);
                  }}
                  className="rounded-md p-2 text-left text-sm font-medium text-red-600 transition-all duration-75 hover:bg-red-600 hover:text-white"
                >
                  <IconMenu
                    text={
                      session?.user?.email === email
                        ? "Leave workspace"
                        : currentTab === "Members"
                          ? "Remove teammate"
                          : "Revoke invite"
                    }
                    icon={<UserMinus className="h-4 w-4" />}
                  />
                </button>
              </div>
            }
            align="end"
            openPopover={openPopover}
            setOpenPopover={setOpenPopover}
          >
            <div>
              <Button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenPopover(!openPopover);
                }}
                icon={<ThreeDots className="h-5 w-5 text-neutral-500" />}
                className="h-8 space-x-0 px-1 py-2"
                variant="outline"
                {...(permissionsError &&
                  session?.user?.email !== email && {
                    disabledTooltip: permissionsError,
                  })}
              />
            </div>
          </Popover>
        </div>
      </div>
    </>
  );
};

const UserPlaceholder = () => (
  <div className="flex items-center justify-between space-x-3 px-4 py-3 sm:px-8">
    <div className="flex items-center space-x-3">
      <div className="h-10 w-10 animate-pulse rounded-full bg-neutral-200" />
      <div className="flex flex-col">
        <div className="h-4 w-24 animate-pulse rounded bg-neutral-200" />
        <div className="mt-1 h-3 w-32 animate-pulse rounded bg-neutral-200" />
      </div>
    </div>
    <div className="h-3 w-24 animate-pulse rounded bg-neutral-200" />
  </div>
);
