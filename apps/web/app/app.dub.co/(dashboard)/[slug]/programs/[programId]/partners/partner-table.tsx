"use client";

import usePartnersCount from "@/lib/swr/use-partners-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { EnrolledPartnerProps } from "@/lib/types";
import EditColumnsButton from "@/ui/analytics/events/edit-columns-button";
import { PartnerDetailsSheet } from "@/ui/partners/partner-details-sheet";
import { PartnerRowItem } from "@/ui/partners/partner-row-item";
import { PartnerStatusBadges } from "@/ui/partners/partner-status-badges";
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
import { Dots, Users } from "@dub/ui/icons";
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
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { partnersColumns, useColumnVisibility } from "./use-column-visibility";
import { usePartnerFilters } from "./use-partner-filters";

export function PartnerTable() {
  const { programId } = useParams();
  const { id: workspaceId } = useWorkspace();
  const { queryParams, searchParams, getQueryString } = useRouterStuff();

  const sortBy = searchParams.get("sortBy") || "createdAt";
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

  const { data: partners, error } = useSWR<EnrolledPartnerProps[]>(
    `/api/programs/${programId}/partners${getQueryString(
      {
        workspaceId,
      },
      { ignore: ["partnerId"] },
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
                  alt=""
                  src={`https://flag.vercel.app/m/${country}.svg`}
                  className="h-3 w-4"
                />
              )}
              {(country ? COUNTRIES[country] : null) ?? "-"}
            </div>
          );
        },
      },
      {
        id: "clicks",
        header: "Clicks",
        accessorFn: (d) =>
          d.status !== "pending"
            ? nFormatter(d.link?.clicks, { full: true })
            : "-",
      },
      {
        id: "leads",
        header: "Leads",
        accessorFn: (d) =>
          d.status !== "pending"
            ? nFormatter(d.link?.leads, { full: true })
            : "-",
      },
      {
        id: "sales",
        header: "Sales",
        accessorFn: (d) =>
          d.status !== "pending"
            ? nFormatter(d.link?.sales, { full: true })
            : "-",
      },
      {
        id: "earnings",
        header: "Earnings",
        accessorFn: (d) =>
          d.status !== "pending"
            ? currencyFormatter(d.earnings / 100, {
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
        cell: ({ row }) => <RowMenuButton row={row} />,
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
    sortableColumns: ["createdAt", "clicks", "leads", "sales", "earnings"],
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
    loading: !partners && !error && !countError,
    error: error || countError ? "Failed to load partners" : undefined,
  });

  return (
    <div className="flex flex-col gap-3">
      {detailsSheetState.partner && (
        <PartnerDetailsSheet
          isOpen={detailsSheetState.open}
          setIsOpen={(open) =>
            setDetailsSheetState((s) => ({ ...s, open }) as any)
          }
          partner={detailsSheetState.partner}
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
          <SearchBoxPersisted />
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

function RowMenuButton({ row }: { row: Row<EnrolledPartnerProps> }) {
  const router = useRouter();
  const { slug, programId } = useParams();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover
      openPopover={isOpen}
      setOpenPopover={setIsOpen}
      content={
        <Command tabIndex={0} loop className="focus:outline-none">
          <Command.List className="flex w-screen flex-col gap-1 p-1.5 text-sm sm:w-auto sm:min-w-[130px]">
            <MenuItem
              icon={MoneyBill2}
              label="View sales"
              onSelect={() => {
                router.push(
                  `/${slug}/programs/${programId}/sales?partnerId=${row.original.id}`,
                );
                setIsOpen(false);
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
  );
}

function MenuItem({
  icon: IconComp,
  label,
  onSelect,
}: {
  icon: Icon;
  label: string;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      className={cn(
        "flex cursor-pointer select-none items-center gap-2 whitespace-nowrap rounded-md p-2 text-sm text-neutral-600",
        "data-[selected=true]:bg-gray-100",
      )}
      onSelect={onSelect}
    >
      <IconComp className="size-4 shrink-0 text-neutral-500" />
      {label}
    </Command.Item>
  );
}
