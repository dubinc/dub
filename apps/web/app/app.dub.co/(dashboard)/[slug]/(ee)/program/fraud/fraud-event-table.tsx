"use client";

import { deleteProgramInviteAction } from "@/lib/actions/partners/delete-program-invite";
import { resendProgramInviteAction } from "@/lib/actions/partners/resend-program-invite";
import { mutatePrefix } from "@/lib/swr/mutate";
import { useFraudEvents } from "@/lib/swr/use-fraud-events";
import { useFraudEventsCount } from "@/lib/swr/use-fraud-events-count";
import usePartner from "@/lib/swr/use-partner";
import useWorkspace from "@/lib/swr/use-workspace";
import { EnrolledPartnerProps, FraudEvent } from "@/lib/types";
import { FRAUD_EVENT_TYPE_DESCRIPTIONS } from "@/lib/zod/schemas/fraud-events";
import { CustomerRowItem } from "@/ui/customers/customer-row-item";
import { useArchivePartnerModal } from "@/ui/partners/archive-partner-modal";
import { useBanPartnerModal } from "@/ui/partners/ban-partner-modal";
import { FraudEventStatusBadges } from "@/ui/partners/fraud-event-status-badges";
import { PartnerDetailsSheet } from "@/ui/partners/partner-details-sheet";
import { PartnerRowItem } from "@/ui/partners/partner-row-item";
import { useUnbanPartnerModal } from "@/ui/partners/unban-partner-modal";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
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
} from "@dub/ui/icons";
import { cn, currencyFormatter, fetcher, formatDate } from "@dub/utils";
import { Row } from "@tanstack/react-table";
import { Command } from "cmdk";
import { LockOpen } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { useColumnVisibility } from "../partners/use-column-visibility";
import { usePartnerFilters } from "../partners/use-partner-filters";

export function FraudEventTable() {
  const { slug } = useParams();
  const { id: workspaceId } = useWorkspace();
  const { pagination, setPagination } = usePagination();
  const { queryParams, searchParams, getQueryString } = useRouterStuff();
  const { columnVisibility, setColumnVisibility } = useColumnVisibility();

  const {
    fraudEventsCount,
    loading: fraudEventsCountLoading,
    error: fraudEventsCountError,
  } = useFraudEventsCount<number>();

  const {
    fraudEvents,
    loading: fraudEventsLoading,
    error: fraudEventsError,
  } = useFraudEvents();

  const {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveAll,
    isFiltered,
  } = usePartnerFilters({});

  const {
    data: partners,
    error,
    isLoading,
  } = useSWR<EnrolledPartnerProps[]>(
    `/api/partners${getQueryString(
      {
        workspaceId,
        includeExpandedFields: true,
      },
      { exclude: ["partnerId"] },
    )}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  const [detailsSheetState, setDetailsSheetState] = useState<
    | { open: false; partnerId: string | null }
    | { open: true; partnerId: string }
  >({ open: false, partnerId: null });

  useEffect(() => {
    const partnerId = searchParams.get("partnerId");
    if (partnerId) setDetailsSheetState({ open: true, partnerId });
  }, [searchParams]);

  const { currentPartner, isLoading: isCurrentPartnerLoading } =
    useCurrentPartner({
      partners,
      partnerId: detailsSheetState.partnerId,
    });

  const { table, ...tableProps } = useTable({
    data: fraudEvents || [],
    columns: [
      {
        id: "partner",
        header: "Partner",
        enableHiding: false,
        minSize: 200,
        size: 200,
        cell: ({ row }) => {
          return (
            <PartnerRowItem
              partner={row.original.partner}
              showPayoutsEnabled={false}
            />
          );
        },
      },
      {
        id: "customer",
        header: "Customer",
        enableHiding: false,
        minSize: 200,
        size: 200,
        cell: ({ row }) => {
          return row.original.customer ? (
            <CustomerRowItem
              customer={row.original.customer}
              avatarClassName="size-5"
              href={`/${slug}/customers/${row.original.customer.id}`}
            />
          ) : (
            "-"
          );
        },
      },
      {
        id: "flagged",
        header: "Flagged",
        minSize: 200,
        size: 200,
        accessorFn: (d: FraudEvent) =>
          formatDate(d.createdAt, { month: "short" }),
      },
      {
        id: "status",
        header: "Status",
        minSize: 200,
        size: 200,
        cell: ({ row }) => {
          const badge = FraudEventStatusBadges[row.original.status];

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
        id: "reason",
        header: "Reason",
        minSize: 200,
        size: 200,
        cell: ({ row }) => FRAUD_EVENT_TYPE_DESCRIPTIONS[row.original.type],
      },
      {
        id: "holdAmount",
        header: "Hold amount",
        minSize: 200,
        size: 200,
        accessorFn: (d) =>
          d.holdAmount
            ? currencyFormatter(d.holdAmount / 100, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
            : "-",
      },
      {
        id: "menu",
        enableHiding: false,
        minSize: 43,
        size: 43,
        maxSize: 43,
        header: () => <EditColumnsButton table={table} />,
      },
    ],
    onRowClick: (row) => {
      queryParams({
        set: {
          fraudEventId: row.original.id,
        },
        scroll: false,
      });
    },
    pagination,
    onPaginationChange: setPagination,
    columnVisibility,
    onColumnVisibilityChange: setColumnVisibility,
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    resourceName: (p) => `fraud event${p ? "s" : ""}`,
    rowCount: fraudEventsCount || 0,
    loading: fraudEventsCountLoading || fraudEventsLoading,
    error:
      fraudEventsCountError || fraudEventsError
        ? "Failed to load fraud events"
        : undefined,
  });

  return (
    <div className="flex flex-col gap-6">
      {detailsSheetState.partnerId && currentPartner && (
        <PartnerDetailsSheet
          isOpen={detailsSheetState.open}
          setIsOpen={(open) =>
            setDetailsSheetState((s) => ({ ...s, open }) as any)
          }
          partner={currentPartner}
        />
      )}
      <div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Filter.Select
            className="w-full md:w-fit"
            filters={filters}
            activeFilters={activeFilters}
            onSelect={onSelect}
            onRemove={onRemove}
          />
          {/* <SearchBoxPersisted
            placeholder="Search by name, email, or link"
            inputClassName="md:w-72"
          /> */}
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
      {fraudEvents?.length !== 0 ? (
        <Table {...tableProps} table={table} />
      ) : (
        <AnimatedEmptyState
          title="No fraud events found"
          description={
            isFiltered
              ? "No fraud events found for the selected filters."
              : "No fraud events have been flagged for this program yet."
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
