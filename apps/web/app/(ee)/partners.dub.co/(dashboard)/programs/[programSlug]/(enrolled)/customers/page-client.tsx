"use client";

import { PARTNER_CUSTOMERS_MAX_PAGE_SIZE } from "@/lib/constants/partner-profile";
import usePartnerCustomers from "@/lib/swr/use-partner-customers";
import usePartnerCustomersCount from "@/lib/swr/use-partner-customers-count";
import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import { CustomerRowItem } from "@/ui/customers/customer-row-item";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { SearchBoxPersisted } from "@/ui/shared/search-box";
import {
  AnimatedSizeContainer,
  Filter,
  LinkLogo,
  Table,
  TimestampTooltip,
  useColumnVisibility,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import { User } from "@dub/ui/icons";
import {
  COUNTRIES,
  currencyFormatter,
  formatDate,
  getApexDomain,
  getPrettyUrl,
} from "@dub/utils";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { usePartnerCustomerFilters } from "./use-partner-customer-filters";

export function ProgramCustomersPageClient() {
  const { searchParams, queryParams } = useRouterStuff();

  const { programSlug } = useParams<{ programSlug: string }>();
  const { programEnrollment } = useProgramEnrollment();

  const { data: customersCount, error: countError } =
    usePartnerCustomersCount();
  const { data: customers, isLoading, error } = usePartnerCustomers();

  const { pagination, setPagination } = usePagination(
    PARTNER_CUSTOMERS_MAX_PAGE_SIZE,
  );

  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

  const {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveAll,
    isFiltered,
    setSelectedFilter,
  } = usePartnerCustomerFilters();

  const customersColumns = {
    all: ["customer", "country", "link", "saleAmount", "createdAt"],
    defaultVisible: ["customer", "country", "link", "saleAmount", "createdAt"],
  };

  const { columnVisibility, setColumnVisibility } = useColumnVisibility(
    "partner-customers-table-columns",
    customersColumns,
  );

  const columns = useMemo(
    () => [
      {
        id: "customer",
        header: "Customer",
        enableHiding: false,
        minSize: 250,
        cell: ({ row }) => {
          return (
            <CustomerRowItem
              customer={row.original}
              href={`/programs/${programSlug}/customers/${row.original.id}`}
              chartActivityIconMode="visible"
            />
          );
        },
      },
      {
        id: "country",
        header: "Country",
        accessorKey: "country",
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
        id: "link",
        header: "Link",
        accessorKey: "activity.link",
        cell: ({ row }) =>
          row.original.activity.link ? (
            <Link
              href={`/programs/${programSlug}/links?domain=${row.original.activity.link.domain}&key=${row.original.activity.link.key}`}
              className="flex cursor-alias items-center gap-3 decoration-dotted underline-offset-2 hover:underline"
            >
              <LinkLogo
                apexDomain={getApexDomain(row.original.activity.link.shortLink)}
                className="size-4 shrink-0 sm:size-4"
              />
              <span
                className="truncate"
                title={row.original.activity.link.shortLink}
              >
                {getPrettyUrl(row.original.activity.link.shortLink)}
              </span>
            </Link>
          ) : (
            "-"
          ),
        size: 250,
      },
      {
        id: "saleAmount",
        header: "Lifetime value",
        accessorKey: "activity.ltv",
        cell: ({ getValue }) => (
          <div className="flex items-center gap-2">
            <span>
              {currencyFormatter(getValue() ?? 0, {
                trailingZeroDisplay: "stripIfInteger",
              })}
            </span>
            <span className="text-neutral-400">USD</span>
          </div>
        ),
      },
      {
        id: "createdAt",
        header: "Created",
        cell: ({ row }) => (
          <TimestampTooltip
            timestamp={row.original.createdAt}
            rows={["local"]}
            side="left"
            delayDuration={150}
          >
            <span>
              {formatDate(row.original.createdAt, { month: "short" })}
            </span>
          </TimestampTooltip>
        ),
      },
    ],
    [programSlug],
  );

  const { table, ...tableProps } = useTable({
    data: customers || [],
    columns,
    pagination,
    onPaginationChange: setPagination,
    columnVisibility,
    onColumnVisibilityChange: setColumnVisibility,
    sortableColumns: ["saleAmount", "createdAt"],
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
    resourceName: (p) => `customer${p ? "s" : ""}`,
    rowCount: customersCount || 0,
    loading: isLoading,
    error: error || countError ? "Failed to load customers" : undefined,
  });

  return (
    <PageWidthWrapper className="pb-10">
      <div className="flex flex-col gap-3">
        <div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <Filter.Select
              className="w-full md:w-fit"
              filters={filters}
              activeFilters={activeFilters}
              onSelect={onSelect}
              onRemove={onRemove}
              onSelectedFilterChange={setSelectedFilter}
            />
            {Boolean(programEnrollment?.customerDataSharingEnabledAt) && (
              <SearchBoxPersisted
                placeholder="Search by email or name"
                inputClassName="md:w-[16rem]"
              />
            )}
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

        {customers?.length !== 0 ? (
          <Table {...tableProps} table={table} />
        ) : (
          <AnimatedEmptyState
            title={isFiltered ? "No customers found" : "No customers yet"}
            description={
              isFiltered
                ? "No customers found for the selected filters. Adjust your filters to refine your search results."
                : "No customers have been recorded for this program yet. Once customers start converting through your links, they'll appear here."
            }
            cardContent={() => (
              <>
                <User className="size-4 text-neutral-700" />
                <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
              </>
            )}
          />
        )}
      </div>
    </PageWidthWrapper>
  );
}
