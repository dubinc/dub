"use client";

import { clientAccessCheck } from "@/lib/client-access-check";
import useWorkspace from "@/lib/swr/use-workspace";
import { WorkspaceUserProps } from "@/lib/types";
import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { useInviteCodeModal } from "@/ui/modals/invite-code-modal";
import { useInviteWorkspaceUserModal } from "@/ui/modals/invite-workspace-user-modal";
import { useRemoveWorkspaceUserModal } from "@/ui/modals/remove-workspace-user-modal";
import { useWorkspaceUserRoleModal } from "@/ui/modals/update-workspace-user-role";
import { SearchBoxPersisted } from "@/ui/shared/search-box";
import { PartnerRole } from "@dub/prisma/client";
import {
  Avatar,
  Button,
  Filter,
  Popover,
  Table,
  useKeyboardShortcut,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import {
  CircleCheck,
  CircleDotted,
  Dots,
  EnvelopeArrowRight,
  Icon,
  Link4 as LinkIcon,
  User,
  UserCheck,
  UserCrown,
} from "@dub/ui/icons";
import { cn, fetcher, timeAgo } from "@dub/utils";
import { ColumnDef, Row } from "@tanstack/react-table";
import { Command } from "cmdk";
import { UserMinus } from "lucide-react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";

export default function WorkspacePeopleClient() {
  const { setShowInviteWorkspaceUserModal, InviteWorkspaceUserModal } =
    useInviteWorkspaceUserModal({ showSavedInvites: true });

  const { setShowInviteCodeModal, InviteCodeModal } = useInviteCodeModal();

  const { role } = useWorkspace();
  const { data: session } = useSession();
  const { id: workspaceId } = useWorkspace();

  const { queryParams, searchParams } = useRouterStuff();
  const { pagination, setPagination } = usePagination();

  const status = searchParams.get("status") as "active" | "invited" | null;
  const roleFilter = searchParams.get("role") as PartnerRole | null;
  const search = searchParams.get("search");

  const {
    data: users,
    error,
    isLoading: loading,
  } = useSWR<WorkspaceUserProps[]>(
    workspaceId &&
      `/api/workspaces/${workspaceId}/${status === "invited" ? "invites" : "users"}?${new URLSearchParams(
        {
          ...(search && { search }),
          ...(roleFilter && { role: roleFilter }),
        } as Record<string, any>,
      ).toString()}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  const isCurrentUserOwner = role === "owner";

  // Combined filter configuration
  const filters = useMemo(
    () => [
      {
        key: "role",
        icon: UserCheck,
        label: "Role",
        options: [
          { value: "owner", label: "Owner", icon: UserCrown },
          { value: "member", label: "Member", icon: User },
        ],
      },
      {
        key: "status",
        icon: CircleDotted,
        label: "Status",
        options: [
          {
            value: "active",
            label: "Active",
            icon: (
              <CircleCheck className="size-4 bg-green-100 bg-transparent text-green-600" />
            ),
          },
          {
            value: "invited",
            label: "Invited",
            icon: (
              <EnvelopeArrowRight className="size-4 bg-blue-100 bg-transparent text-blue-600" />
            ),
          },
        ],
      },
    ],
    [],
  );

  // Active filters state
  const activeFilters = useMemo(() => {
    const filters: { key: string; value: any }[] = [];
    if (status) {
      filters.push({ key: "status", value: status });
    }
    if (roleFilter) {
      filters.push({ key: "role", value: roleFilter });
    }
    return filters;
  }, [status, roleFilter]);

  useKeyboardShortcut("m", () => setShowInviteWorkspaceUserModal(true));

  const columns = useMemo<ColumnDef<WorkspaceUserProps>[]>(
    () => [
      {
        id: "name",
        header: "Name",
        accessorFn: (row) => row.name || row.email,
        minSize: 360,
        size: 870,
        maxSize: 900,
        cell: ({ row }) => {
          const user = row.original;
          const isCurrentUser = session?.user?.email === user.email;

          return (
            <div className="flex items-center space-x-3">
              <Avatar user={user} />
              <div className="flex flex-col">
                <h3 className="text-sm font-medium">
                  {user.name || user.email}
                  {isCurrentUser && (
                    <span className="ml-1.5 text-neutral-500">(You)</span>
                  )}
                </h3>
                <p className="text-xs text-neutral-500">
                  {status === "invited"
                    ? `Invited ${timeAgo(user.createdAt)}`
                    : user.email}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        id: "role",
        header: "Role",
        accessorFn: (row) => row.role,
        minSize: 120,
        size: 150,
        maxSize: 200,
        cell: ({ row }) =>
          !row.original.isMachine && (
            <RoleCell
              user={row.original}
              isCurrentUser={session?.user?.email === row.original.email}
              isCurrentUserOwner={isCurrentUserOwner}
            />
          ),
      },
      {
        id: "menu",
        enableHiding: false,
        minSize: 43,
        size: 43,
        maxSize: 43,
        header: () => null,
        cell: ({ row }) => (
          <RowMenuButton row={row} isCurrentUserOwner={isCurrentUserOwner} />
        ),
      },
    ],
    [session?.user?.email, isCurrentUserOwner, status],
  );

  const { table, ...tableProps } = useTable({
    data: users || [],
    columns,
    pagination,
    onPaginationChange: setPagination,
    getRowId: (row) =>
      `${row.id || row.email}-${status}-${roleFilter || "all"}`,
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    resourceName: (p) =>
      `${status === "invited" ? "invite" : "member"}${p ? "s" : ""}`,
    rowCount: users?.length || 0,
    loading,
    error: error ? "Failed to load members" : undefined,
  });

  const onSelect = (key: string, value: any) => {
    queryParams({
      set: {
        [key]: value,
      },
    });
  };

  const onRemove = (key: string) => {
    queryParams({
      del: [key, "page"],
    });
  };

  const onRemoveAll = () => {
    queryParams({
      del: ["role", "status", "page"],
    });
  };

  return (
    <>
      <InviteWorkspaceUserModal />
      <InviteCodeModal />
      <PageContent
        title="Members"
        controls={
          isCurrentUserOwner && (
            <div className="flex space-x-2">
              <Button
                text="Invite member"
                onClick={() => setShowInviteWorkspaceUserModal(true)}
                className="h-9 w-fit"
                shortcut="M"
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
          )
        }
      >
        <PageWidthWrapper className="mb-20 flex flex-col gap-4">
          <div className="flex justify-between gap-3">
            <Filter.Select
              filters={filters}
              activeFilters={activeFilters}
              onSelect={onSelect}
              onRemove={onRemove}
            />
            <SearchBoxPersisted
              placeholder="Search by name or email"
              inputClassName="w-full md:w-[20rem]"
            />
          </div>
          <Filter.List
            filters={filters}
            activeFilters={activeFilters}
            onSelect={onSelect}
            onRemove={onRemove}
            onRemoveAll={onRemoveAll}
          />
          <Table {...tableProps} table={table} />
        </PageWidthWrapper>
      </PageContent>
    </>
  );
}

function RoleCell({
  user,
  isCurrentUser,
  isCurrentUserOwner,
}: {
  user: WorkspaceUserProps;
  isCurrentUser: boolean;
  isCurrentUserOwner: boolean;
}) {
  const [role, setRole] = useState<PartnerRole>(user.role);

  useEffect(() => {
    setRole(user.role);
  }, [user.role]);

  const { WorkspaceUserRoleModal, setShowWorkspaceUserRoleModal } =
    useWorkspaceUserRoleModal({
      user: {
        id: user.id || "",
        name: user.name || "",
        email: user.email || "",
        image: user.image || "",
        createdAt: user.createdAt,
        source: null,
        isMachine: false,
        hasPassword: false,
        provider: null,
      },
      role: role as "owner" | "member",
    });

  const isDisabled =
    !isCurrentUserOwner || // Only owners can change roles
    isCurrentUser; // Can't change your own role

  return (
    <>
      <WorkspaceUserRoleModal />
      <select
        className={cn(
          "rounded-md border border-neutral-200 text-xs text-neutral-500 focus:border-neutral-600 focus:ring-neutral-600",
          {
            "cursor-not-allowed bg-neutral-100": isDisabled,
          },
        )}
        value={role}
        disabled={isDisabled}
        onChange={(e) => {
          const newRole = e.target.value as PartnerRole;
          setRole(newRole);
          setShowWorkspaceUserRoleModal(true);
        }}
        title={
          !isCurrentUserOwner
            ? "Only owners can change member roles"
            : isCurrentUser
              ? "You cannot change your own role"
              : undefined
        }
      >
        <option value="owner">Owner</option>
        <option value="member">Member</option>
      </select>
    </>
  );
}

function RowMenuButton({
  row,
  isCurrentUserOwner,
}: {
  row: Row<WorkspaceUserProps>;
  isCurrentUserOwner: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: session } = useSession();

  const user = row.original;
  const searchParams = useSearchParams();
  const isInvite = searchParams.get("status") === "invited";

  const { RemoveWorkspaceUserModal, setShowRemoveWorkspaceUserModal } =
    useRemoveWorkspaceUserModal({
      user: {
        id: user.id || "",
        name: user.name || "",
        email: user.email || "",
        image: user.image || "",
        createdAt: user.createdAt,
        source: null,
        isMachine: false,
        hasPassword: false,
        provider: null,
      },
    });

  const isCurrentUser = session?.user?.email === user.email;

  // Only show menu if user is owner OR they're removing themselves
  if (!isCurrentUserOwner && !isCurrentUser) {
    return null;
  }

  return (
    <>
      <RemoveWorkspaceUserModal />
      <Popover
        openPopover={isOpen}
        setOpenPopover={setIsOpen}
        content={
          <Command tabIndex={0} loop className="focus:outline-none">
            <Command.List className="w-screen text-sm focus-visible:outline-none sm:w-auto sm:min-w-[200px]">
              <Command.Group className="grid gap-px p-1.5">
                <MenuItem
                  icon={UserMinus}
                  label={
                    isCurrentUser
                      ? "Leave workspace"
                      : isInvite
                        ? "Revoke invitation"
                        : "Remove member"
                  }
                  variant="danger"
                  onSelect={() => {
                    setShowRemoveWorkspaceUserModal(true);
                    setIsOpen(false);
                  }}
                />
              </Command.Group>
            </Command.List>
          </Command>
        }
        align="end"
      >
        <Button
          type="button"
          className="h-8 whitespace-nowrap px-2 disabled:border-transparent disabled:bg-transparent"
          variant="outline"
          icon={<Dots className="h-4 w-4 shrink-0" />}
        />
      </Popover>
    </>
  );
}

function MenuItem({
  icon: IconComp,
  label,
  onSelect,
  variant = "default",
}: {
  icon: Icon;
  label: string;
  onSelect: () => void;
  variant?: "default" | "danger";
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm",
        variant === "danger"
          ? "text-red-600 hover:bg-red-50"
          : "text-neutral-700 hover:bg-neutral-100",
      )}
    >
      <IconComp className="size-4 shrink-0" />
      {label}
    </Command.Item>
  );
}
