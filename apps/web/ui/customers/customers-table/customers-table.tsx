"use client";

import { getPlanCapabilities } from "@/lib/plan-capabilities";
import useCustomersCount from "@/lib/swr/use-customers-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { CustomerProps } from "@/lib/types";
import { getCustomersQuerySchema } from "@/lib/zod/schemas/customers";
import { CustomerRowItem } from "@/ui/customers/customer-row-item";
import { PartnerRowItem } from "@/ui/partners/partner-row-item";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { FilterButtonTableRow } from "@/ui/shared/filter-button-table-row";
import { SearchBoxPersisted } from "@/ui/shared/search-box";
import {
  AnimatedSizeContainer,
  Button,
  buttonVariants,
  CopyText,
  EditColumnsButton,
  Filter,
  LinkLogo,
  MenuItem,
  Popover,
  Table,
  TimestampTooltip,
  useColumnVisibility,
  useCopyToClipboard,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import { Copy, Dots, User } from "@dub/ui/icons";
import {
  cn,
  COUNTRIES,
  currencyFormatter,
  fetcher,
  formatDate,
  getApexDomain,
  getPrettyUrl,
} from "@dub/utils";
import { Cell, Row } from "@tanstack/react-table";
import { Command } from "cmdk";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import * as z from "zod/v4";
import { EXAMPLE_CUSTOMER_DATA } from "./example-data";
import { useCustomerFilters } from "./use-customer-filters";

type ColumnMeta = {
  filterParams?: (
    args: Pick<Cell<CustomerProps, any>, "getValue">,
  ) => Record<string, any>;
};

export function CustomersTable({
  query,
  isProgramPage = false,
}: {
  query?: Partial<z.infer<typeof getCustomersQuerySchema>>;
  isProgramPage?: boolean;
}) {
  const { id: workspaceId, slug: workspaceSlug, plan } = useWorkspace();
  const { canManageCustomers } = getPlanCapabilities(plan);

  const router = useRouter();
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
    setSearch,
    setSelectedFilter,
  } = useCustomerFilters(
    { sortBy, sortOrder },
    { enabled: canManageCustomers },
  );

  const { data: customersCount, error: countError } = useCustomersCount({
    enabled: canManageCustomers,
    query,
  });

  const {
    data: customers,
    error,
    isLoading,
  } = useSWR<CustomerProps[]>(
    canManageCustomers &&
      `/api/customers${getQueryString({
        workspaceId,
        includeExpandedFields: "true",
        ...query,
      })}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  const customersColumns = {
    all: [
      "customer",
      "country",
      ...(isProgramPage ? ["partner"] : []),
      "link",
      "saleAmount",
      "createdAt",
      "firstSaleAt",
      "subscriptionCanceledAt",
      "externalId",
    ],
    defaultVisible: [
      "customer",
      "country",
      ...(isProgramPage ? ["partner"] : ["link"]),
      "saleAmount",
      "createdAt",
      "firstSaleAt",
      "subscriptionCanceledAt",
    ],
  };

  const { columnVisibility, setColumnVisibility } = useColumnVisibility(
    isProgramPage
      ? "program-customers-table-columns"
      : "customers-table-columns",
    customersColumns,
  );

  const { pagination, setPagination } = usePagination();

  if (!canManageCustomers) columnVisibility.link = false;

  const columns = useMemo(
    () =>
      [
        {
          id: "customer",
          header: "Customer",
          enableHiding: false,
          minSize: 250,
          cell: ({ row }) => {
            return (
              <CustomerRowItem
                customer={row.original}
                chartActivityIconMode="visible"
              />
            );
          },
        },
        {
          id: "country",
          header: "Country",
          accessorKey: "country",
          meta: {
            filterParams: ({ getValue }) =>
              getValue()
                ? {
                    country: getValue(),
                  }
                : undefined,
          },
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
          id: "partner",
          header: "Partner",
          meta: {
            filterParams: ({ row }) =>
              row.original.partner?.id
                ? {
                    partnerId: row.original.partner.id,
                  }
                : undefined,
          },
          cell: ({ row }) =>
            row.original.partner ? (
              <PartnerRowItem partner={row.original.partner} />
            ) : (
              "-"
            ),
          size: 200,
        },
        {
          id: "link",
          header: "Link",
          accessorKey: "link",
          meta: {
            filterParams: ({ getValue }) =>
              getValue() ? { linkId: getValue().id } : undefined,
          },
          cell: ({ row }) =>
            row.original.link ? (
              <Link
                href={`/${workspaceSlug}/links/${row.original.link.domain}/${row.original.link.key}`}
                target="_blank"
                className="flex cursor-alias items-center gap-3 decoration-dotted underline-offset-2 hover:underline"
              >
                <LinkLogo
                  apexDomain={getApexDomain(row.original.link.url)}
                  className="size-4 shrink-0 sm:size-4"
                />
                <span className="truncate" title={row.original.link.shortLink}>
                  {getPrettyUrl(row.original.link.shortLink)}
                </span>
              </Link>
            ) : (
              "-"
            ),
          size: 250,
        },
        {
          id: "saleAmount",
          header: "LTV",
          meta: {
            headerTooltip:
              "The total amount of revenue the customer has generated over time (lifetime value).",
          },
          accessorKey: "saleAmount",
          cell: ({ getValue }) => (
            <div className="flex items-center gap-2">
              <span>
                {currencyFormatter(getValue(), {
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
          meta: {
            headerTooltip:
              "The date the customer was created (usually the signup date or trial start date).",
          },
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
        {
          id: "firstSaleAt",
          header: "Paid",
          meta: {
            headerTooltip: "The date the customer made their first sale.",
          },
          cell: ({ row }) =>
            row.original.firstSaleAt ? (
              <TimestampTooltip
                timestamp={row.original.firstSaleAt}
                rows={["local"]}
                side="left"
                delayDuration={150}
              >
                <span>
                  {formatDate(row.original.firstSaleAt, { month: "short" })}
                </span>
              </TimestampTooltip>
            ) : (
              "-"
            ),
        },
        {
          id: "subscriptionCanceledAt",
          header: "Canceled",
          meta: {
            headerTooltip: "The date the customer canceled their subscription.",
          },
          cell: ({ row }) =>
            row.original.subscriptionCanceledAt ? (
              <TimestampTooltip
                timestamp={row.original.subscriptionCanceledAt}
                rows={["local"]}
                side="left"
                delayDuration={150}
              >
                <span>
                  {formatDate(row.original.subscriptionCanceledAt, {
                    month: "short",
                  })}
                </span>
              </TimestampTooltip>
            ) : (
              "-"
            ),
        },
        {
          id: "externalId",
          header: "External ID",
          accessorKey: "externalId",
          cell: ({ row }) =>
            row.original.externalId ? (
              <CopyText
                value={row.original.externalId}
                successMessage="Copied external ID to clipboard!"
                className="truncate"
              >
                {row.original.externalId}
              </CopyText>
            ) : (
              "-"
            ),
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
      ].filter((c) => c.id === "menu" || customersColumns.all.includes(c.id)),
    [isProgramPage, workspaceSlug],
  );

  const getCustomerUrl = (row: Row<CustomerProps>) =>
    isProgramPage
      ? `/${workspaceSlug}/program/customers/${row.original.id}`
      : `/${workspaceSlug}/customers/${row.original.id}`;

  const { table, ...tableProps } = useTable({
    data: canManageCustomers ? customers || [] : EXAMPLE_CUSTOMER_DATA,
    columns,
    columnPinning: { right: ["menu"] },
    onRowClick: (row, e) => {
      const url = getCustomerUrl(row);

      if (e.metaKey || e.ctrlKey) window.open(url, "_blank");
      else router.push(url);
    },
    onRowAuxClick: (row) => window.open(getCustomerUrl(row), "_blank"),
    rowProps: (row) => ({
      onPointerEnter: () => {
        router.prefetch(getCustomerUrl(row));
      },
    }),
    pagination,
    onPaginationChange: setPagination,
    columnVisibility,
    onColumnVisibilityChange: setColumnVisibility,
    sortableColumns: ["createdAt", "saleAmount"],
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
    cellRight: (cell) => {
      const meta = cell.column.columnDef.meta as ColumnMeta | undefined;
      return (
        meta?.filterParams && (
          <FilterButtonTableRow set={meta.filterParams(cell)} />
        )
      );
    },
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    resourceName: (p) => `customer${p ? "s" : ""}`,
    rowCount: customersCount || 0,
    loading: isLoading,
    error: error || countError ? "Failed to load customers" : undefined,
  });

  return (
    <div className="flex flex-col gap-3">
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
          <SearchBoxPersisted
            placeholder="Search by email or name"
            inputClassName="md:w-[16rem]"
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
      {!canManageCustomers || customers?.length !== 0 ? (
        <Table
          {...tableProps}
          table={table}
          scrollWrapperClassName={
            canManageCustomers ? undefined : "overflow-x-hidden"
          }
        >
          {!canManageCustomers && (
            <>
              <div className="absolute inset-0 flex touch-pan-y flex-col items-center justify-center bg-gradient-to-t from-[#fff_75%] to-[#fff6] px-4 text-center">
                <div className="h-40 w-full max-w-[480px] overflow-hidden [mask-image:linear-gradient(black,transparent)]">
                  <div className="relative h-96 w-full overflow-hidden rounded-lg border border-neutral-200">
                    <Image
                      src="https://assets.dub.co/misc/customer-screenshot.jpg"
                      fill
                      className="object-contain object-top"
                      alt="Customer overview screenshot"
                      draggable={false}
                    />
                  </div>
                </div>
                <div className="relative -mt-4 flex flex-col items-center justify-center">
                  <span className="text-lg font-semibold text-neutral-700">
                    Customer Insights
                  </span>
                  <p className="mt-3 max-w-sm text-pretty text-sm text-neutral-500">
                    Want to see more details about your customers' LTV, country
                    breakdown etc.? Upgrade to our Business Plan to get deeper,
                    real-time customer insights.{" "}
                    <a
                      href="https://dub.co/help/article/customer-insights"
                      target="_blank"
                      className="underline underline-offset-2 hover:text-neutral-800"
                    >
                      Learn more ↗
                    </a>
                  </p>
                  <div className="mt-4">
                    <Link
                      href={`/${workspaceSlug}/upgrade`}
                      className={cn(
                        buttonVariants({ variant: "secondary" }),
                        "flex h-8 items-center justify-center gap-2 rounded-md border px-4 text-sm",
                      )}
                    >
                      <span className="bg-gradient-to-r from-violet-600 to-pink-600 bg-clip-text text-transparent">
                        Upgrade to Business
                      </span>
                    </Link>
                  </div>
                </div>
              </div>
              <div className="h-[420px]" />
            </>
          )}
        </Table>
      ) : (
        <AnimatedEmptyState
          title={`No customers ${isFiltered ? "found" : "yet"}`}
          description={
            isFiltered
              ? "No customers found for the selected filters. Adjust your filters to refine your search results."
              : "No customers have been recorded for your workspace yet. Learn how to track your first customer."
          }
          {...(!isFiltered && {
            learnMoreHref: `/${workspaceSlug}/settings/analytics`,
            learnMoreTarget: "_self",
            learnMoreText: "Read the guides",
          })}
          cardContent={() => (
            <>
              <User className="size-4 text-neutral-700" />
              <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
            </>
          )}
        />
      )}
    </div>
  );
}

function RowMenuButton({ row }: { row: Row<CustomerProps> }) {
  const [isOpen, setIsOpen] = useState(false);

  const [, copyToClipboard] = useCopyToClipboard();

  return (
    <>
      <Popover
        openPopover={isOpen}
        setOpenPopover={setIsOpen}
        content={
          <Command tabIndex={0} loop className="focus:outline-none">
            <Command.List className="flex w-screen flex-col gap-1 p-1.5 text-sm focus-visible:outline-none sm:w-auto sm:min-w-[130px]">
              {row.original.externalId && (
                <MenuItem
                  as={Command.Item}
                  icon={Copy}
                  onSelect={() => {
                    toast.promise(copyToClipboard(row.original.externalId), {
                      success: "Copied to clipboard",
                    });
                    setIsOpen(false);
                  }}
                >
                  Copy external ID
                </MenuItem>
              )}
              {row.original.email && (
                <MenuItem
                  as={Command.Item}
                  icon={Copy}
                  onSelect={() => {
                    toast.promise(copyToClipboard(row.original.email!), {
                      success: "Copied to clipboard",
                    });
                    setIsOpen(false);
                  }}
                >
                  Copy email
                </MenuItem>
              )}
            </Command.List>
          </Command>
        }
        align="end"
      >
        <Button
          type="button"
          className="h-8 whitespace-nowrap px-2 disabled:border-transparent disabled:bg-transparent"
          variant="outline"
          icon={<Dots className="h-4 w-4 shrink-0" />}
          disabled={!row.original.externalId && !row.original.email}
        />
      </Popover>
    </>
  );
}
