"use client";

import useGroups from "@/lib/swr/use-groups";
import useGroupsCount from "@/lib/swr/use-groups-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { GroupExtendedProps } from "@/lib/types";
import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import { useDeleteGroupModal } from "@/ui/modals/delete-group-modal";
import { GroupColorCircle } from "@/ui/partners/groups/group-color-circle";
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
import { Dots, MoneyBill2, PenWriting, Trash, Users } from "@dub/ui/icons";
import { cn, currencyFormatter, nFormatter } from "@dub/utils";
import { Row } from "@tanstack/react-table";
import { Command } from "cmdk";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

export function GroupsTable() {
  const router = useRouter();
  const { slug } = useWorkspace();
  const { pagination, setPagination } = usePagination();
  const { queryParams, searchParams } = useRouterStuff();

  const sortBy = searchParams.get("sortBy") || "saleAmount";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

  const { groups, loading, error } = useGroups<GroupExtendedProps>({
    query: {
      includeExpandedFields: true,
    },
  });

  const {
    groupsCount,
    loading: countLoading,
    error: countError,
  } = useGroupsCount();

  const isFiltered = !!searchParams.get("search");

  const { table, ...tableProps } = useTable({
    data: groups
      ? groups.map((group) => {
          // prefetch the group page
          router.prefetch(`/${slug}/program/groups/${group.slug}`);
          return group;
        })
      : [],
    columns: [
      {
        id: "group",
        header: "Group",
        enableHiding: false,
        minSize: 250,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <GroupColorCircle group={row.original} />
            <span>{row.original.name}</span>
          </div>
        ),
      },
      {
        id: "partners",
        header: "Partners",
        accessorFn: (d) => nFormatter(d.partners),
      },
      {
        id: "clicks",
        header: "Clicks",
        accessorFn: (d) => nFormatter(d.clicks),
      },
      {
        id: "leads",
        header: "Leads",
        accessorFn: (d) => nFormatter(d.leads),
      },
      {
        id: "conversions",
        header: "Conversions",
        accessorFn: (d) => nFormatter(d.conversions),
      },
      {
        id: "saleAmount",
        header: "Revenue",
        accessorFn: (d) =>
          currencyFormatter(d.saleAmount / 100, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
      },
      {
        id: "commissions",
        header: "Commissions",
        accessorFn: (d) =>
          currencyFormatter(d.commissions / 100, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
      },
      {
        id: "netRevenue",
        header: "Net Revenue",
        accessorFn: (d) =>
          currencyFormatter(d.netRevenue / 100, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
      },
      {
        id: "menu",
        enableHiding: false,
        minSize: 43,
        size: 43,
        maxSize: 43,
        header: () => <EditColumnsButton table={table} />,
        cell: ({ row }) => <RowMenuButton row={row} />,
      },
    ],
    onRowClick: (row) => {
      router.push(`/${slug}/program/groups/${row.original.slug}`);
    },
    pagination,
    onPaginationChange: setPagination,
    sortableColumns: [
      "partners",
      "clicks",
      "leads",
      "conversions",
      "saleAmount",
      "commissions",
      "netRevenue",
    ],
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

function RowMenuButton({ row }: { row: Row<GroupExtendedProps> }) {
  const router = useRouter();
  const { slug } = useParams();
  const [isOpen, setIsOpen] = useState(false);

  const { DeleteGroupModal, setShowDeleteGroupModal } = useDeleteGroupModal(
    row.original,
  );

  return (
    <>
      <DeleteGroupModal />
      <Popover
        openPopover={isOpen}
        setOpenPopover={setIsOpen}
        content={
          <Command tabIndex={0} loop className="focus:outline-none">
            <Command.List className="flex w-screen flex-col gap-1 p-1.5 text-sm focus-visible:outline-none sm:w-auto sm:min-w-[200px]">
              <MenuItem
                icon={PenWriting}
                label="Edit group"
                variant="default"
                onSelect={async () => {
                  router.push(
                    `/${slug}/program/groups/${row.original.slug}/settings`,
                  );
                  setIsOpen(false);
                }}
              />

              <MenuItem
                icon={MoneyBill2}
                label="View commissions"
                variant="default"
                onSelect={async () => {
                  router.push(
                    `/${slug}/program/commissions?groupId=${row.original.id}`,
                  );
                  setIsOpen(false);
                }}
              />

              {row.original.slug !== DEFAULT_PARTNER_GROUP.slug && (
                <MenuItem
                  icon={Trash}
                  label="Delete group"
                  variant="danger"
                  onSelect={async () => {
                    setShowDeleteGroupModal(true);
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
