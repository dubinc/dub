"use client";

import usePartnerCustomers from "@/lib/swr/use-partner-customers";
import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import { CustomerRowItem } from "@/ui/customers/customer-row-item";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { SearchBoxPersisted } from "@/ui/shared/search-box";
import {
  LinkLogo,
  Table,
  TimestampTooltip,
  useColumnVisibility,
  usePagination,
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

export function ProgramCustomersPageClient() {
  const { programSlug } = useParams<{ programSlug: string }>();
  const { programEnrollment } = useProgramEnrollment();

  const { data: customers, isLoading } = usePartnerCustomers();

  const { pagination, setPagination } = usePagination();

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
    sortableColumns: [],
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    resourceName: (p) => `customer${p ? "s" : ""}`,
    rowCount: customers?.length || 0,
    loading: isLoading,
    error: !isLoading && !customers ? "Failed to load customers" : undefined,
  });

  return (
    <PageWidthWrapper className="pb-10">
      <div className="flex flex-col gap-3">
        {Boolean(programEnrollment?.customerDataSharingEnabledAt) && (
          <SearchBoxPersisted
            placeholder="Search by email or name"
            inputClassName="w-full"
          />
        )}

        {customers?.length !== 0 ? (
          <Table {...tableProps} table={table} />
        ) : (
          <AnimatedEmptyState
            title="No customers yet"
            description="No customers have been recorded for this program yet. Once customers start converting through your links, they'll appear here."
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
