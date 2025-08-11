"use client";

import useGroups from "@/lib/swr/use-groups";
import useGroupsCount from "@/lib/swr/use-groups-count";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { GroupProps } from "@/lib/types";
import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { SearchBoxPersisted } from "@/ui/shared/search-box";
import {
  Button,
  EditColumnsButton,
  Icon,
  Popover,
  Table,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import { Dots, LoadingSpinner, Trash, Users } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { Row } from "@tanstack/react-table";
import { Command } from "cmdk";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

export function GroupsTable() {
  const { id: workspaceId } = useWorkspace();
  const { pagination, setPagination } = usePagination();
  const { queryParams, searchParams, getQueryString } = useRouterStuff();

  const sortBy = searchParams.get("sortBy") || "netRevenue";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

  const { program } = useProgram();

  const { groups, loading, error } = useGroups({});
  const {
    groupsCount,
    loading: countLoading,
    error: countError,
  } = useGroupsCount();

  const isFiltered = !!searchParams.get("search");

  const { table, ...tableProps } = useTable({
    data: groups || [],
    columns: [
      {
        id: "group",
        header: "Group",
        enableHiding: false,
        minSize: 250,
        cell: ({ row }) => {
          const color = row.original.color || program?.brandColor;
          return (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <div
                  className="size-3 shrink-0 rounded-full"
                  style={{
                    background:
                      color ||
                      "conic-gradient(in hsl, #ee535d 0deg, #e9d988 90deg, #9fe0b8 180deg, #bf87e4 270deg, #ee535d 360deg)",
                  }}
                />
                <span>{row.original.name}</span>
              </div>
            </div>
          );
        },
      },
      {
        id: "menu",
        enableHiding: false,
        minSize: 43,
        size: 43,
        maxSize: 43,
        header: () => <EditColumnsButton table={table} />,
        cell: ({ row }) => (
          <RowMenuButton row={row} workspaceId={workspaceId!} />
        ),
      },
    ],
    onRowClick: (row) => {
      // TODO: Navigate to group page
    },

    pagination,
    onPaginationChange: setPagination,

    sortableColumns: ["netRevenue"],
    sortBy,
    sortOrder,
    onSortChange: ({ sortBy, sortOrder }) =>
      queryParams({
        set: {
          ...(sortBy && { sortBy }),
          ...(sortOrder && { sortOrder }),
        },
        del: "page",
        scroll: false,
      }),

    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    resourceName: (p) => `group${p ? "s" : ""}`,
    rowCount: groupsCount || 0,
    loading: loading || countLoading,
    error: error || countError ? "Failed to load groups" : undefined,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <SearchBoxPersisted
          placeholder="Search by name"
          inputClassName="md:w-72"
        />
      </div>

      {groups?.length !== 0 ? (
        <Table {...tableProps} table={table} />
      ) : (
        <AnimatedEmptyState
          title="No groups found"
          description={
            isFiltered
              ? "No groups found for the selected filters."
              : "No groups have been added to this program yet."
          }
          cardContent={() => (
            <>
              <Users className="size-4 text-neutral-700" />
              <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
            </>
          )}
        />
      )}
    </div>
  );
}

function RowMenuButton({
  row,
  workspaceId,
}: {
  row: Row<GroupProps>;
  workspaceId: string;
}) {
  const router = useRouter();
  const { slug } = useParams();
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  return (
    <>
      <Popover
        openPopover={isOpen}
        setOpenPopover={setIsOpen}
        content={
          <Command tabIndex={0} loop className="focus:outline-none">
            <Command.List className="flex w-screen flex-col gap-1 p-1.5 text-sm focus-visible:outline-none sm:w-auto sm:min-w-[200px]">
              {row.original.slug !== DEFAULT_PARTNER_GROUP.slug && (
                <MenuItem
                  icon={isDeleting ? LoadingSpinner : Trash}
                  label="Delete group"
                  variant="danger"
                  onSelect={async () => {
                    // await deleteInvite({
                    //   workspaceId,
                    //   partnerId: row.original.id,
                    // });
                  }}
                />
              )}
            </Command.List>
          </Command>
        }
        align="end"
      >
        <Button
          type="button"
          className="h-8 whitespace-nowrap px-2"
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
  const variantStyles = {
    default: {
      text: "text-neutral-600",
      icon: "text-neutral-500",
    },
    danger: {
      text: "text-red-600",
      icon: "text-red-600",
    },
  };

  const { text, icon } = variantStyles[variant];

  return (
    <Command.Item
      className={cn(
        "flex cursor-pointer select-none items-center gap-2 whitespace-nowrap rounded-md p-2 text-sm",
        "data-[selected=true]:bg-neutral-100",
        text,
      )}
      onSelect={onSelect}
    >
      <IconComp className={cn("size-4 shrink-0", icon)} />
      {label}
    </Command.Item>
  );
}
