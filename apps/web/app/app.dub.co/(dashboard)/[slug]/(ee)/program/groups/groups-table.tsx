"use client";

import useGroupsCount from "@/lib/swr/use-groups-count";
import useProgram from "@/lib/swr/use-program";
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
  StatusBadge,
  Table,
  useCopyToClipboard,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import {
  Copy,
  Dots,
  LinesY,
  PenWriting,
  Tick,
  Trash,
  Users,
} from "@dub/ui/icons";
import { cn, currencyFormatter, fetcher, nFormatter } from "@dub/utils";
import { Row } from "@tanstack/react-table";
import { Command } from "cmdk";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";

const getGroupUrl = ({
  workspaceSlug,
  groupSlug,
}: {
  workspaceSlug: string;
  groupSlug: string;
}) => `/${workspaceSlug}/program/groups/${groupSlug}/rewards`;

export function GroupsTable() {
  const router = useRouter();
  const { id: workspaceId, slug, defaultProgramId } = useWorkspace();
  const { program } = useProgram();
  const { pagination, setPagination } = usePagination();
  const { queryParams, searchParams, getQueryString } = useRouterStuff();

  const sortBy =
    searchParams.get("sortBy") ||
    (program?.primaryRewardEvent === "lead" ? "totalLeads" : "totalSaleAmount");
  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

  const {
    data: groups,
    isLoading: groupsLoading,
    error,
  } = useSWR<GroupExtendedProps[]>(
    workspaceId &&
      defaultProgramId &&
      `/api/groups${getQueryString({
        workspaceId: workspaceId,
        includeExpandedFields: "true",
        sortBy,
        sortOrder,
      }).toString()}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  const {
    groupsCount,
    loading: groupsCountLoading,
    error: countError,
  } = useGroupsCount();

  const isFiltered = !!searchParams.get("search");

  const { table, ...tableProps } = useTable({
    data: groups
      ? groups.map((group) => {
          // prefetch the group page
          router.prefetch(
            getGroupUrl({ workspaceSlug: slug!, groupSlug: group.slug }),
          );
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
            {row.original.slug === DEFAULT_PARTNER_GROUP.slug && (
              <StatusBadge variant="new" icon={null} className="px-1.5 py-0.5">
                Default
              </StatusBadge>
            )}
          </div>
        ),
      },
      {
        id: "totalPartners",
        header: "Partners",
        accessorFn: (d) => nFormatter(d.totalPartners, { full: true }),
      },
      {
        id: "totalClicks",
        header: "Clicks",
        accessorFn: (d) => nFormatter(d.totalClicks),
      },
      {
        id: "totalLeads",
        header: "Leads",
        accessorFn: (d) => nFormatter(d.totalLeads),
      },
      {
        id: "totalConversions",
        header: "Conversions",
        accessorFn: (d) => nFormatter(d.totalConversions),
      },
      {
        id: "totalSaleAmount",
        header: "Revenue",
        accessorFn: (d) => currencyFormatter(d.totalSaleAmount / 100),
      },
      {
        id: "totalCommissions",
        header: "Commissions",
        accessorFn: (d) => currencyFormatter(d.totalCommissions / 100),
      },
      {
        id: "netRevenue",
        header: "Net Revenue",
        accessorFn: (d) => currencyFormatter(d.netRevenue / 100),
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
    onRowClick: (row, e) => {
      const url = getGroupUrl({
        workspaceSlug: slug!,
        groupSlug: row.original.slug,
      });

      if (e.metaKey || e.ctrlKey) window.open(url, "_blank");
      else router.push(url);
    },
    onRowAuxClick: (row) =>
      window.open(
        getGroupUrl({ workspaceSlug: slug!, groupSlug: row.original.slug }),
        "_blank",
      ),
    pagination,
    onPaginationChange: setPagination,
    sortableColumns: [
      "totalPartners",
      "totalClicks",
      "totalLeads",
      "totalConversions",
      "totalSaleAmount",
      "totalCommissions",
      // "netRevenue", // TODO: add back when we can sort by this again
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
    loading: groupsLoading || groupsCountLoading,
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

  const [copiedGroupId, copyToClipboard] = useCopyToClipboard();

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
                onSelect={() =>
                  router.push(
                    `/${slug}/program/groups/${row.original.slug}/settings`,
                  )
                }
              />

              <MenuItem
                icon={Users}
                label="View partners"
                variant="default"
                onSelect={() =>
                  router.push(
                    `/${slug}/program/partners?groupId=${row.original.id}`,
                  )
                }
              />

              <MenuItem
                icon={LinesY}
                label="View analytics"
                variant="default"
                onSelect={() =>
                  router.push(
                    `/${slug}/program/analytics?groupId=${row.original.id}`,
                  )
                }
              />

              <MenuItem
                icon={copiedGroupId ? Tick : Copy}
                label="Copy group ID"
                variant="default"
                onSelect={() => {
                  toast.promise(copyToClipboard(row.original.id), {
                    success: "Group ID copied!",
                  });
                }}
              />

              {row.original.slug !== DEFAULT_PARTNER_GROUP.slug && (
                <MenuItem
                  icon={Trash}
                  label="Delete group"
                  variant="danger"
                  onSelect={() => setShowDeleteGroupModal(true)}
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
