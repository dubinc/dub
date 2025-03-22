"use client";

import { deleteProgramInviteAction } from "@/lib/actions/partners/delete-program-invite";
import { resendProgramInviteAction } from "@/lib/actions/partners/resend-program-invite";
import { mutatePrefix } from "@/lib/swr/mutate";
import usePartnersCount from "@/lib/swr/use-partners-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { EnrolledPartnerProps } from "@/lib/types";
import EditColumnsButton from "@/ui/analytics/events/edit-columns-button";
import { useBanPartnerModal } from "@/ui/partners/ban-partner-modal";
import { PartnerApplicationSheet } from "@/ui/partners/partner-application-sheet";
import { PartnerDetailsSheet } from "@/ui/partners/partner-details-sheet";
import { PartnerRowItem } from "@/ui/partners/partner-row-item";
import { PartnerStatusBadges } from "@/ui/partners/partner-status-badges";
import { useUnbanPartnerModal } from "@/ui/partners/unban-partner-modal";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { SearchBoxPersisted } from "@/ui/shared/search-box";
import {
  AnimatedSizeContainer,
  Button,
  Filter,
  Icon,
  MoneyBill2,
  Popover,
  StatusBadge,
  Table,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import {
  Dots,
  EnvelopeArrowRight,
  LoadingSpinner,
  Trash,
  UserDelete,
  Users,
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
import { useEffect, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { partnersColumns, useColumnVisibility } from "./use-column-visibility";
import { usePartnerFilters } from "./use-partner-filters";

export function PartnerTable() {
  const { programId } = useParams();
  const { id: workspaceId } = useWorkspace();
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

  // TODO: Combine with usePartners
  const {
    data: partners,
    error,
    isLoading,
  } = useSWR<EnrolledPartnerProps[]>(
    `/api/partners${getQueryString(
      {
        workspaceId,
        programId,
        includeExpandedFields: "true",
      },
      { exclude: ["partnerId"] },
    )}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  const [detailsSheetState, setDetailsSheetState] = useState<
    | { open: false; partner: EnrolledPartnerProps | null }
    | { open: true; partner: EnrolledPartnerProps }
  >({ open: false, partner: null });

  useEffect(() => {
    const partnerId = searchParams.get("partnerId");
    if (partnerId) {
      const partner = partners?.find((p) => p.id === partnerId);
      if (partner) {
        setDetailsSheetState({ open: true, partner });
      }
    }
  }, [searchParams, partners]);

  const { columnVisibility, setColumnVisibility } = useColumnVisibility();
  const { pagination, setPagination } = usePagination();

  const { table, ...tableProps } = useTable({
    data: partners || [],
    columns: [
      {
        id: "partner",
        header: "Partner",
        enableHiding: false,
        cell: ({ row }) => {
          return <PartnerRowItem partner={row.original} />;
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
        accessorFn: (d) =>
          d.status !== "pending" ? nFormatter(d.clicks, { full: true }) : "-",
      },
      {
        id: "leads",
        header: "Leads",
        accessorFn: (d) =>
          d.status !== "pending" ? nFormatter(d.leads, { full: true }) : "-",
      },
      {
        id: "sales",
        header: "Sales",
        accessorFn: (d) =>
          d.status !== "pending" ? nFormatter(d.sales, { full: true }) : "-",
      },
      {
        id: "saleAmount",
        header: "Revenue",
        accessorFn: (d) =>
          d.status !== "pending"
            ? currencyFormatter(d.saleAmount / 100, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
            : "-",
      },
      {
        id: "commissions",
        header: "Commissions",
        accessorFn: (d) =>
          d.status !== "pending"
            ? currencyFormatter(d.commissions / 100, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
            : "-",
      },
      {
        id: "netRevenue",
        header: "Net Revenue",
        accessorFn: (d) =>
          d.status !== "pending"
            ? currencyFormatter(d.netRevenue / 100, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
            : "-",
      },
      // Menu
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
    ].filter((c) => c.id === "menu" || partnersColumns.all.includes(c.id)),
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
    columnVisibility,
    onColumnVisibilityChange: setColumnVisibility,
    sortableColumns: [
      "createdAt",
      "clicks",
      "leads",
      "sales",
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
        scroll: false,
      }),
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    resourceName: (p) => `partner${p ? "s" : ""}`,
    rowCount: partnersCount || 0,
    loading: isLoading,
    error: error || countError ? "Failed to load partners" : undefined,
  });

  return (
    <div className="flex flex-col gap-3">
      {detailsSheetState.partner &&
        (detailsSheetState.partner.status === "pending" ? (
          <PartnerApplicationSheet
            isOpen={detailsSheetState.open}
            setIsOpen={(open) =>
              setDetailsSheetState((s) => ({ ...s, open }) as any)
            }
            partner={detailsSheetState.partner}
          />
        ) : (
          <PartnerDetailsSheet
            isOpen={detailsSheetState.open}
            setIsOpen={(open) =>
              setDetailsSheetState((s) => ({ ...s, open }) as any)
            }
            partner={detailsSheetState.partner}
          />
        ))}
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
  const { slug, programId } = useParams();
  const [isOpen, setIsOpen] = useState(false);

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
        mutatePrefix(
          `/api/partners?workspaceId=${workspaceId}&programId=${programId}`,
        );

        toast.success("Deleted the partner invite.");
        setIsOpen(false);
      },
      onError: ({ error }) => {
        toast.error(error.serverError);
      },
    },
  );

  return (
    <>
      <BanPartnerModal />
      <UnbanPartnerModal />
      <Popover
        openPopover={isOpen}
        setOpenPopover={setIsOpen}
        content={
          <Command tabIndex={0} loop className="focus:outline-none">
            <Command.List className="flex w-screen flex-col gap-1 p-1.5 text-sm sm:w-auto sm:min-w-[130px]">
              {row.original.status === "invited" ? (
                <>
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
                        programId: row.original.programId!,
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
                        programId: row.original.programId!,
                        partnerId: row.original.id,
                      });
                    }}
                  />
                </>
              ) : (
                <>
                  <MenuItem
                    icon={MoneyBill2}
                    label="View sales"
                    onSelect={() => {
                      router.push(
                        `/${slug}/programs/${programId}/sales?partnerId=${row.original.id}&interval=all`,
                      );
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
