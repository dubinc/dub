"use client";

import { deleteProgramInviteAction } from "@/lib/actions/partners/delete-program-invite";
import { resendProgramInviteAction } from "@/lib/actions/partners/resend-program-invite";
import { mutatePrefix } from "@/lib/swr/mutate";
import useGroups from "@/lib/swr/use-groups";
import usePartner from "@/lib/swr/use-partner";
import usePartnersCount from "@/lib/swr/use-partners-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { EnrolledPartnerProps } from "@/lib/types";
import { useArchivePartnerModal } from "@/ui/partners/archive-partner-modal";
import { useBanPartnerModal } from "@/ui/partners/ban-partner-modal";
import { useChangeGroupModal } from "@/ui/partners/change-group-modal";
import { GroupColorCircle } from "@/ui/partners/groups/group-color-circle";
import { PartnerRowItem } from "@/ui/partners/partner-row-item";
import { PartnerStatusBadges } from "@/ui/partners/partner-status-badges";
import { useUnbanPartnerModal } from "@/ui/partners/unban-partner-modal";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { SearchBoxPersisted } from "@/ui/shared/search-box";
import {
  AnimatedSizeContainer,
  Button,
  EditColumnsButton,
  Filter,
  Icon,
  MoneyBill2,
  Popover,
  StatusBadge,
  Table,
  useColumnVisibility,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import {
  BoxArchive,
  Dots,
  EnvelopeArrowRight,
  LoadingSpinner,
  Trash,
  UserDelete,
  Users,
  Users6,
} from "@dub/ui/icons";
import {
  cn,
  COUNTRIES,
  currencyFormatter,
  fetcher,
  formatDate,
} from "@dub/utils";
import { nFormatter } from "@dub/utils/src/functions";
import { Row } from "@tanstack/react-table";
import { Command } from "cmdk";
import { LockOpen } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { usePartnerFilters } from "./use-partner-filters";

const partnersColumns = {
  all: [
    "partner",
    "group",
    "createdAt",
    "status",
    "location",
    "clicks",
    "leads",
    "conversions",
    "sales",
    "saleAmount",
    "totalCommissions",
    "netRevenue",
  ],
  defaultVisible: [
    "partner",
    "group",
    "location",
    "clicks",
    "leads",
    "conversions",
    "saleAmount",
    "totalCommissions",
  ],
};

const getPartnerUrl = ({
  workspaceSlug,
  id,
}: {
  workspaceSlug: string;
  id: string;
}) => `/${workspaceSlug}/program/partners/${id}`;

export function PartnersTable() {
  const { id: workspaceId, slug: workspaceSlug } = useWorkspace();
  const router = useRouter();
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

  const { partnersCount, error: countError } = usePartnersCount<number>();

  const {
    data: partners,
    error,
    isLoading,
  } = useSWR<EnrolledPartnerProps[]>(
    `/api/partners${getQueryString({
      workspaceId,
      includeExpandedFields: true,
    })}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  const { groups } = useGroups();

  const [pendingChangeGroupPartners, setPendingChangeGroupPartners] = useState<
    EnrolledPartnerProps[]
  >([]);

  const { ChangeGroupModal, setShowChangeGroupModal } = useChangeGroupModal({
    partners: pendingChangeGroupPartners,
  });

  const { columnVisibility, setColumnVisibility } = useColumnVisibility(
    "partners-table-columns", // TODO: update to v2 once we add partner groups
    partnersColumns,
  );

  const { pagination, setPagination } = usePagination();

  const columns = useMemo(
    () =>
      [
        {
          id: "partner",
          header: "Partner",
          enableHiding: false,
          minSize: 250,
          cell: ({ row }) => {
            return (
              <PartnerRowItem partner={row.original} showPermalink={false} />
            );
          },
        },
        {
          id: "group",
          header: "Group",
          cell: ({ row }) => {
            if (!groups) return "-";

            const group = groups.find((g) => g.id === row.original.groupId);

            if (!group) return "-";

            return (
              <div className="flex items-center gap-2">
                <GroupColorCircle group={group} />
                <span className="truncate text-sm font-medium">
                  {group.name}
                </span>
              </div>
            );
          },
        },
        {
          id: "createdAt",
          header: "Enrolled",
          accessorFn: (d) => formatDate(d.createdAt, { month: "short" }),
        },
        {
          id: "status",
          header: "Status",
          cell: ({ row }) => {
            const badge = PartnerStatusBadges[row.original.status];
            return badge ? (
              <StatusBadge icon={null} variant={badge.variant}>
                {badge.label}
              </StatusBadge>
            ) : (
              "-"
            );
          },
        },
        {
          id: "location",
          header: "Location",
          minSize: 150,
          cell: ({ row }) => {
            const country = row.original.country;
            return (
              <div className="flex items-center gap-2">
                {country && (
                  <img
                    alt={`${country} flag`}
                    src={`https://hatscripts.github.io/circle-flags/flags/${country.toLowerCase()}.svg`}
                    className="size-4 shrink-0"
                  />
                )}
                <span className="min-w-0 truncate">
                  {(country ? COUNTRIES[country] : null) ?? "-"}
                </span>
              </div>
            );
          },
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
          id: "sales",
          header: "Sales",
          accessorFn: (d) => nFormatter(d.sales),
        },
        {
          id: "saleAmount",
          header: "Revenue",
          accessorFn: (d) => currencyFormatter(d.saleAmount / 100),
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
        // Menu
        {
          id: "menu",
          enableHiding: false,
          minSize: 43,
          size: 43,
          maxSize: 43,
          header: ({ table }) => <EditColumnsButton table={table} />,
          cell: ({ row }) => (
            <RowMenuButton row={row} workspaceId={workspaceId!} />
          ),
        },
      ].filter((c) => c.id === "menu" || partnersColumns.all.includes(c.id)),
    [workspaceId, groups],
  );

  const { table, ...tableProps } = useTable({
    data: partners || [],
    columns,
    onRowClick: (row, e) => {
      const url = getPartnerUrl({
        workspaceSlug: workspaceSlug!,
        id: row.original.id,
      });

      if (e.metaKey || e.ctrlKey) window.open(url, "_blank");
      else router.push(url);
    },
    onRowAuxClick: (row) =>
      window.open(
        getPartnerUrl({ workspaceSlug: workspaceSlug!, id: row.original.id }),
        "_blank",
      ),
    rowProps: (row) => ({
      onPointerEnter: () => {
        router.prefetch(
          getPartnerUrl({ workspaceSlug: workspaceSlug!, id: row.original.id }),
        );
      },
    }),
    pagination,
    onPaginationChange: setPagination,
    columnVisibility,
    onColumnVisibilityChange: setColumnVisibility,
    sortableColumns: [
      "createdAt",
      "clicks",
      "leads",
      "conversions",
      "sales",
      "saleAmount",
      "totalCommissions",
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

    getRowId: (row) => row.id,
    selectionControls: (table) => (
      <>
        <Button
          variant="primary"
          text="Add to group"
          icon={<Users6 className="size-3.5 shrink-0" />}
          className="h-7 w-fit rounded-lg px-2.5"
          loading={false}
          onClick={() => {
            const partners = table
              .getSelectedRowModel()
              .rows.map((row) => row.original);

            setPendingChangeGroupPartners(partners);
            setShowChangeGroupModal(true);
          }}
        />
        {/* <Button
          variant="secondary"
          text="Archive"
          icon={<BoxArchive className="size-3.5 shrink-0" />}
          className="h-7 w-fit rounded-lg px-2.5"
          loading={false}
          onClick={() => {
            const partnerIds = table
              .getSelectedRowModel()
              .rows.map((row) => row.original.id);

            toast.info("WIP");
          }}
        />
        <Button
          variant="secondary"
          text="Ban"
          icon={<UserXmark className="size-3.5 shrink-0" />}
          className="h-7 w-fit rounded-lg px-2.5 text-red-700"
          loading={false}
          onClick={() => {
            const partnerIds = table
              .getSelectedRowModel()
              .rows.map((row) => row.original.id);

            toast.info("WIP");
          }}
        /> */}
      </>
    ),
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    resourceName: (p) => `partner${p ? "s" : ""}`,
    rowCount: partnersCount || 0,
    loading: isLoading,
    error: error || countError ? "Failed to load partners" : undefined,
  });

  return (
    <div className="flex flex-col gap-6">
      <ChangeGroupModal />
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
            placeholder="Search by ID, name, email, or link"
            inputClassName="md:w-[19rem]"
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
      {partners?.length !== 0 ? (
        <Table {...tableProps} table={table} />
      ) : (
        <AnimatedEmptyState
          title="No partners found"
          description={
            isFiltered
              ? "No partners found for the selected filters."
              : "No partners have been added to this program yet."
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
  row: Row<EnrolledPartnerProps>;
  workspaceId: string;
}) {
  const router = useRouter();
  const { slug } = useParams();
  const [isOpen, setIsOpen] = useState(false);

  const { ChangeGroupModal, setShowChangeGroupModal } = useChangeGroupModal({
    partners: [row.original],
  });

  const { ArchivePartnerModal, setShowArchivePartnerModal } =
    useArchivePartnerModal({
      partner: row.original,
    });

  const { BanPartnerModal, setShowBanPartnerModal } = useBanPartnerModal({
    partner: row.original,
  });

  const { UnbanPartnerModal, setShowUnbanPartnerModal } = useUnbanPartnerModal({
    partner: row.original,
  });

  const { executeAsync: resendInvite, isPending: isResendingInvite } =
    useAction(resendProgramInviteAction, {
      onSuccess: async () => {
        toast.success("Resent the partner invite.");
        setIsOpen(false);
      },
      onError: ({ error }) => {
        toast.error(error.serverError);
      },
    });

  const { executeAsync: deleteInvite, isPending: isDeletingInvite } = useAction(
    deleteProgramInviteAction,
    {
      onSuccess: async () => {
        await mutatePrefix("/api/partners");
        setIsOpen(false);
        toast.success("Deleted the partner invite.");
      },
      onError: ({ error }) => {
        toast.error(error.serverError);
      },
    },
  );

  return (
    <>
      <ChangeGroupModal />
      <ArchivePartnerModal />
      <BanPartnerModal />
      <UnbanPartnerModal />
      <Popover
        openPopover={isOpen}
        setOpenPopover={setIsOpen}
        content={
          <Command tabIndex={0} loop className="focus:outline-none">
            <Command.List className="flex w-screen flex-col gap-1 p-1.5 text-sm focus-visible:outline-none sm:w-auto sm:min-w-[200px]">
              {row.original.status === "invited" ? (
                <>
                  <MenuItem
                    icon={Users6}
                    label="Change group"
                    onSelect={() => {
                      setShowChangeGroupModal(true);
                      setIsOpen(false);
                    }}
                  />

                  <MenuItem
                    icon={
                      isResendingInvite ? LoadingSpinner : EnvelopeArrowRight
                    }
                    label="Resend invite"
                    onSelect={async () => {
                      if (row.original.status !== "invited") {
                        return;
                      }

                      await resendInvite({
                        workspaceId,
                        partnerId: row.original.id,
                      });
                    }}
                  />

                  <MenuItem
                    icon={isDeletingInvite ? LoadingSpinner : Trash}
                    label="Delete invite"
                    variant="danger"
                    onSelect={async () => {
                      if (row.original.status !== "invited") {
                        return;
                      }
                      if (
                        !window.confirm(
                          "Are you sure you want to delete this invite? This action cannot be undone.",
                        )
                      ) {
                        return;
                      }

                      await deleteInvite({
                        workspaceId,
                        partnerId: row.original.id,
                      });
                    }}
                  />
                </>
              ) : (
                <>
                  <MenuItem
                    icon={MoneyBill2}
                    label="View commissions"
                    onSelect={() => {
                      router.push(
                        `/${slug}/program/commissions?partnerId=${row.original.id}&interval=all`,
                      );
                      setIsOpen(false);
                    }}
                  />

                  <MenuItem
                    icon={Users6}
                    label="Change group"
                    onSelect={() => {
                      setShowChangeGroupModal(true);
                      setIsOpen(false);
                    }}
                  />

                  <MenuItem
                    icon={BoxArchive}
                    label={
                      row.original.status === "archived"
                        ? "Unarchive partner"
                        : "Archive partner"
                    }
                    onSelect={() => {
                      setShowArchivePartnerModal(true);
                      setIsOpen(false);
                    }}
                  />

                  {row.original.status !== "banned" ? (
                    <MenuItem
                      icon={UserDelete}
                      label="Ban partner"
                      variant="danger"
                      onSelect={() => {
                        setShowBanPartnerModal(true);
                        setIsOpen(false);
                      }}
                    />
                  ) : (
                    <MenuItem
                      icon={LockOpen}
                      label="Unban partner"
                      onSelect={() => {
                        setShowUnbanPartnerModal(true);
                        setIsOpen(false);
                      }}
                    />
                  )}
                </>
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

/** Gets the current partner from the loaded partners array if available, or a separate fetch if not */
function useCurrentPartner({
  partners,
  partnerId,
}: {
  partners?: EnrolledPartnerProps[];
  partnerId: string | null;
}) {
  let currentPartner = partnerId
    ? partners?.find(({ id }) => id === partnerId)
    : null;

  const { partner: fetchedPartner, loading: isLoading } = usePartner(
    {
      partnerId: partners && partnerId && !currentPartner ? partnerId : null,
    },
    {
      keepPreviousData: true,
    },
  );

  if (!currentPartner && fetchedPartner?.id === partnerId) {
    currentPartner = fetchedPartner;
  }

  return { currentPartner, isLoading };
}
