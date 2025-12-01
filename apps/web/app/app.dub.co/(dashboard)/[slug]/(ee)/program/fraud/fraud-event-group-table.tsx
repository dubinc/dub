"use client";

import { FRAUD_RULES_BY_TYPE } from "@/lib/api/fraud/constants";
import { mutatePrefix } from "@/lib/swr/mutate";
import { useFraudEventGroups } from "@/lib/swr/use-fraud-event-groups";
import { useFraudGroupCount } from "@/lib/swr/use-fraud-groups-count";
import { fraudEventGroupProps } from "@/lib/types";
import { useBanPartnerModal } from "@/ui/modals/ban-partner-modal";
import { useBulkBanPartnersModal } from "@/ui/modals/bulk-ban-partners-modal";
import { FraudReviewSheet } from "@/ui/partners/fraud-risks/fraud-review-sheet";
import { PartnerRowItem } from "@/ui/partners/partner-row-item";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { FilterButtonTableRow } from "@/ui/shared/filter-button-table-row";
import {
  AnimatedSizeContainer,
  Badge,
  Button,
  Filter,
  Icon,
  Popover,
  Table,
  TimestampTooltip,
  Tooltip,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import { Dots, ShieldAlert, UserDelete } from "@dub/ui/icons";
import { cn, formatDateTimeSmart } from "@dub/utils";
import { Row } from "@tanstack/react-table";
import { Command } from "cmdk";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFraudGroupFilters } from "./use-fraud-group-filters";

export function FraudEventGroupTable() {
  const { queryParams, searchParams } = useRouterStuff();
  const { pagination, setPagination } = usePagination();

  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

  const {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveAll,
    setSearch,
    setSelectedFilter,
  } = useFraudGroupFilters({
    status: "pending",
  });

  const { fraudEventGroups, loading, error } = useFraudEventGroups({
    query: {
      status: "pending",
    },
    exclude: ["groupId"],
  });

  const [detailsSheetState, setDetailsSheetState] = useState<
    { open: false; groupId: string | null } | { open: true; groupId: string }
  >({ open: false, groupId: null });

  useEffect(() => {
    const groupId = searchParams.get("groupId");

    if (groupId) {
      setDetailsSheetState({ open: true, groupId });
    } else {
      setDetailsSheetState({ open: false, groupId: null });
    }
  }, [searchParams]);

  const { currentFraudEventGroup } = useCurrentFraudEventGroup({
    fraudEventGroups: fraudEventGroups,
    groupId: detailsSheetState.groupId,
  });

  const { fraudGroupsCount, error: countError } = useFraudGroupCount<number>({
    query: {
      status: "pending",
    },
  });

  const [pendingBanPartners, setPendingBanPartners] = useState<
    Array<NonNullable<fraudEventGroupProps["partner"]>>
  >([]);

  const tableRef = useRef<
    ReturnType<typeof useTable<fraudEventGroupProps>>["table"] | null
  >(null);

  const { BulkBanPartnersModal, setShowBulkBanPartnersModal } =
    useBulkBanPartnersModal({
      partners: pendingBanPartners,
      onConfirm: async () => {
        tableRef.current?.resetRowSelection();
        await mutatePrefix("/api/fraud/events");
      },
    });

  const { table, ...tableProps } = useTable<fraudEventGroupProps>({
    data: fraudEventGroups || [],
    columns: [
      {
        id: "type",
        header: "Event",
        size: 150,
        cell: ({ row }) => {
          const reason = FRAUD_RULES_BY_TYPE[row.original.type];
          const count = row.original.eventCount ?? 1;

          if (reason) {
            return (
              <div className="flex items-center gap-2">
                <Tooltip content={reason.description}>
                  <span
                    className={cn(
                      "cursor-help truncate underline decoration-dotted underline-offset-2",
                    )}
                  >
                    {reason.name}
                  </span>
                </Tooltip>

                {count > 1 && (
                  <Badge
                    variant="gray"
                    className="shrink-0 rounded-md border-none px-1.5 py-1 text-xs font-semibold text-neutral-700"
                  >
                    +{Number(count) - 1}
                  </Badge>
                )}
              </div>
            );
          }
        },
        meta: {
          filterParams: ({ row }) => ({
            type: row.original.type,
          }),
        },
      },
      {
        id: "partner",
        header: "Partner",
        size: 150,
        cell: ({ row }) => {
          const partner = row.original.partner;
          if (!partner) return "-";

          return (
            <PartnerRowItem
              partner={{
                id: partner.id,
                name: partner.name || "Unknown",
                image: partner.image,
              }}
              showPermalink={false}
              showFraudIndicator={false}
            />
          );
        },
        meta: {
          filterParams: ({ row }) =>
            row.original.partner
              ? {
                  partnerId: row.original.partner.id,
                }
              : {},
        },
      },
      {
        id: "createdAt",
        header: "Last Detected",
        size: 150,
        meta: {
          headerTooltip:
            "The date and time of the most recent occurrence of this fraud event.",
        },
        cell: ({ row }) => (
          <TimestampTooltip
            timestamp={row.original.lastEventAt}
            side="right"
            rows={["local", "utc", "unix"]}
            delayDuration={150}
          >
            <span>{formatDateTimeSmart(row.original.lastEventAt)}</span>
          </TimestampTooltip>
        ),
      },
      {
        id: "menu",
        minSize: 30,
        size: 30,
        maxSize: 30,
        cell: ({ row }) => <RowMenuButton row={row} />,
      },
    ],
    columnPinning: { right: ["menu"] },
    cellRight: (cell) => {
      const meta = cell.column.columnDef.meta as
        | {
            filterParams?: any;
          }
        | undefined;

      return (
        meta?.filterParams && (
          <FilterButtonTableRow set={meta.filterParams(cell)} />
        )
      );
    },
    pagination,
    onPaginationChange: setPagination,
    sortableColumns: ["createdAt", "type"],
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
    onRowClick: (row) => {
      queryParams({
        set: {
          groupId: row.original.id,
        },
        scroll: false,
      });
    },
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    resourceName: (plural) => `fraud event${plural ? "s" : ""}`,
    rowCount: fraudGroupsCount ?? 0,
    loading,
    error: error || countError ? "Failed to load fraud events" : undefined,
    selectionControls: (tableInstance) => {
      // Store table reference for resetting selection
      tableRef.current = tableInstance;

      const selectedRows = tableInstance.getSelectedRowModel().rows;
      const partners = selectedRows.map((row) => row.original.partner);

      // Remove duplicates by partner ID
      const uniquePartners = Array.from(
        new Map(partners.map((p) => [p.id, p])).values(),
      );

      if (uniquePartners.length === 0) return null;

      return (
        <Button
          variant="danger"
          text="Ban"
          icon={<UserDelete className="size-3.5 shrink-0" />}
          className="h-7 w-fit rounded-lg bg-red-600 px-2.5 text-white"
          loading={false}
          onClick={() => {
            setPendingBanPartners(uniquePartners);
            setShowBulkBanPartnersModal(true);
          }}
        />
      );
    },
  });

  const [previousGroupId, nextGroupId] = useMemo(() => {
    if (!fraudEventGroups || !detailsSheetState.groupId) return [null, null];

    const currentIndex = fraudEventGroups.findIndex(
      ({ id }) => id === detailsSheetState.groupId,
    );
    if (currentIndex === -1) return [null, null];

    return [
      currentIndex > 0 ? fraudEventGroups[currentIndex - 1].id : null,
      currentIndex < fraudEventGroups.length - 1
        ? fraudEventGroups[currentIndex + 1].id
        : null,
    ];
  }, [fraudEventGroups, detailsSheetState.groupId]);

  return (
    <div className="flex flex-col gap-6">
      <BulkBanPartnersModal />
      {detailsSheetState.groupId && currentFraudEventGroup && (
        <FraudReviewSheet
          isOpen={detailsSheetState.open}
          setIsOpen={(open) =>
            setDetailsSheetState((s) => ({ ...s, open }) as any)
          }
          fraudEventGroup={currentFraudEventGroup}
          onPrevious={
            previousGroupId
              ? () =>
                  queryParams({
                    set: { groupId: previousGroupId },
                    scroll: false,
                  })
              : undefined
          }
          onNext={
            nextGroupId
              ? () =>
                  queryParams({
                    set: { groupId: nextGroupId },
                    scroll: false,
                  })
              : undefined
          }
        />
      )}

      {((fraudEventGroups?.length ?? 0) > 0 || (fraudGroupsCount ?? 0) > 0) && (
        <div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <Filter.Select
              className="w-full md:w-fit"
              filters={filters}
              activeFilters={activeFilters}
              onSelect={onSelect}
              onRemove={onRemove}
              onSearchChange={setSearch}
              onSelectedFilterChange={setSelectedFilter}
            />
          </div>
          <AnimatedSizeContainer height>
            <div>
              {activeFilters.length > 0 && (
                <div className="pt-3">
                  <Filter.List
                    filters={filters}
                    activeFilters={activeFilters}
                    onSelect={onSelect}
                    onRemove={onRemove}
                    onRemoveAll={onRemoveAll}
                  />
                </div>
              )}
            </div>
          </AnimatedSizeContainer>
        </div>
      )}
      {fraudEventGroups?.length !== 0 ? (
        <Table {...tableProps} table={table} />
      ) : (
        <AnimatedEmptyState
          title="No pending fraud to review"
          description="There aren't any unresolved fraud events waiting for action right now."
          cardContent={() => (
            <>
              <ShieldAlert className="size-4 text-neutral-700" />
              <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
            </>
          )}
          learnMoreHref="https://dub.co/help/article/fraud-detection"
          learnMoreTarget="_blank"
          learnMoreText="Learn more"
        />
      )}
    </div>
  );
}

function RowMenuButton({ row }: { row: Row<fraudEventGroupProps> }) {
  const fraudEvent = row.original;

  const [isOpen, setIsOpen] = useState(false);

  const { BanPartnerModal, setShowBanPartnerModal } = useBanPartnerModal({
    partner: fraudEvent.partner,
    onConfirm: async () => {
      await mutatePrefix("/api/fraud/events");
    },
  });

  if (fraudEvent.status !== "pending") {
    return null;
  }

  return (
    <>
      <BanPartnerModal />
      <Popover
        openPopover={isOpen}
        setOpenPopover={setIsOpen}
        content={
          <Command tabIndex={0} loop className="focus:outline-none">
            <Command.List className="w-screen text-sm focus-visible:outline-none sm:w-auto sm:min-w-[160px]">
              <Command.Group className="grid gap-px p-1.5">
                <MenuItem
                  icon={UserDelete}
                  label="Ban partner"
                  variant="danger"
                  onSelect={() => {
                    setShowBanPartnerModal(true);
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

// Gets the current fraud event from the loaded array if available, or a separate fetch if not
function useCurrentFraudEventGroup({
  fraudEventGroups,
  groupId,
}: {
  fraudEventGroups?: fraudEventGroupProps[];
  groupId: string | null;
}) {
  let currentFraudEventGroup = groupId
    ? fraudEventGroups?.find(
        (fraudEventGroup) => fraudEventGroup.id === groupId,
      )
    : null;

  const shouldFetch =
    fraudEventGroups && groupId && !currentFraudEventGroup ? groupId : null;

  const { fraudEventGroups: fetchedFraudEventGroups, loading: isLoading } =
    useFraudEventGroups({
      query: { groupId: groupId ?? undefined },
      enabled: Boolean(shouldFetch),
    });

  if (!currentFraudEventGroup && fetchedFraudEventGroups?.[0]?.id === groupId) {
    currentFraudEventGroup = fetchedFraudEventGroups[0];
  }

  return {
    currentFraudEventGroup,
    isLoading,
  };
}
