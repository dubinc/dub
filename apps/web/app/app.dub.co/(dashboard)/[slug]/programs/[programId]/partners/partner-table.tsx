"use client";

import usePartnersCount from "@/lib/swr/use-partners-count";
import { EnrolledPartnerProps } from "@/lib/types";
import { PartnerDetailsSheet } from "@/ui/partners/partner-details-sheet";
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
import { Dots, Users } from "@dub/ui/src/icons";
import {
  cn,
  COUNTRIES,
  currencyFormatter,
  DICEBEAR_AVATAR_URL,
  fetcher,
  formatDate,
} from "@dub/utils";
import { nFormatter } from "@dub/utils/src/functions";
import { Row } from "@tanstack/react-table";
import { Command } from "cmdk";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import { usePartnerFilters } from "./use-partner-filters";

export function PartnerTable() {
  const { programId } = useParams();
  const { queryParams, searchParams } = useRouterStuff();

  const sortBy = searchParams.get("sort") || "createdAt";
  const order = searchParams.get("order") === "asc" ? "asc" : "desc";

  const {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveAll,
    searchQuery,
    isFiltered,
  } = usePartnerFilters({ sortBy, order });

  const { partnersCount, error: countError } = usePartnersCount();

  const { data: partners, error } = useSWR<EnrolledPartnerProps[]>(
    `/api/programs/${programId}/partners?${searchQuery}`,
    fetcher,
  );

  const [detailsSheetState, setDetailsSheetState] = useState<
    | { open: false; partner: EnrolledPartnerProps | null }
    | { open: true; partner: EnrolledPartnerProps }
  >({ open: false, partner: null });

  const { pagination, setPagination } = usePagination();

  const table = useTable({
    data: partners || [],
    columns: [
      {
        header: "Partner",
        cell: ({ row }) => {
          return (
            <div className="flex items-center gap-2">
              <img
                src={
                  row.original.image ||
                  `${DICEBEAR_AVATAR_URL}${row.original.name}`
                }
                alt={row.original.name}
                className="size-5 rounded-full"
              />
              <div>{row.original.name}</div>
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
        cell: ({ row }) => <RowMenuButton row={row} />,
      },
    ],
    onRowClick: (row) =>
      setDetailsSheetState({ open: true, partner: row.original }),
    pagination,
    onPaginationChange: setPagination,
    sortableColumns: ["createdAt", "earnings"],
    sortBy,
    sortOrder: order,
    onSortChange: ({ sortBy, sortOrder }) =>
      queryParams({
        set: {
          ...(sortBy && { sort: sortBy }),
          ...(sortOrder && { order: sortOrder }),
        },
      }),
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    resourceName: (p) => `partner${p ? "s" : ""}`,
    rowCount: partnersCount?.all || 0,
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
        <Table {...table} />
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
