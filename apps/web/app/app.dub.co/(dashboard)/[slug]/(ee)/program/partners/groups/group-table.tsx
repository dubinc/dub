"use client";

import useGroups from "@/lib/swr/use-groups";
import useGroupsCount from "@/lib/swr/use-groups-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { GroupProps } from "@/lib/types";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { SearchBoxPersisted } from "@/ui/shared/search-box";
import {
  AnimatedSizeContainer,
  Button,
  EditColumnsButton,
  Filter,
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
import { usePartnerFilters } from "../use-partner-filters";

export function GroupTable() {
  const { id: workspaceId } = useWorkspace();
  const { pagination, setPagination } = usePagination();
  const { queryParams, searchParams, getQueryString } = useRouterStuff();

  const sortBy = searchParams.get("sortBy") || "saleAmount";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

  const {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveAll,
    isFiltered,
  } = usePartnerFilters({ sortBy, sortOrder });

  const { groups, loading, error } = useGroups({});
  const {
    groupsCount,
    loading: countLoading,
    error: countError,
  } = useGroupsCount();

  const { table, ...tableProps } = useTable({
    data: groups || [],
    columns: [
      {
        id: "group",
        header: "Group",
        enableHiding: false,
        minSize: 250,
        accessorFn: (d: GroupProps) => d.name,
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
      queryParams({
        set: {
          partnerId: row.original.id,
        },
        scroll: false,
      });
    },
    pagination,
    onPaginationChange: setPagination,
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    resourceName: (p) => `partner${p ? "s" : ""}`,
    rowCount: groupsCount || 0,
    loading: loading || countLoading,
    error: error || countError ? "Failed to load groups" : undefined,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Filter.Select
            className="w-full md:w-fit"
            filters={filters}
            activeFilters={activeFilters}
            onSelect={onSelect}
            onRemove={onRemove}
          />
          <SearchBoxPersisted
            placeholder="Search by name, email, or link"
            inputClassName="md:w-72"
          />
        </div>
        <AnimatedSizeContainer height>
          <div>
            {activeFilters.length > 0 && (
              <div className="pt-3">
                <Filter.List
                  filters={filters}
                  activeFilters={activeFilters}
                  onRemove={onRemove}
                  onRemoveAll={onRemoveAll}
                />
              </div>
            )}
          </div>
        </AnimatedSizeContainer>
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

  // TODO:
  // Hide delete button for default group

  return (
    <>
      <Popover
        openPopover={isOpen}
        setOpenPopover={setIsOpen}
        content={
          <Command tabIndex={0} loop className="focus:outline-none">
            <Command.List className="flex w-screen flex-col gap-1 p-1.5 text-sm focus-visible:outline-none sm:w-auto sm:min-w-[200px]">
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
