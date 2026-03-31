"use client";

import useCustomers from "@/lib/swr/use-customers";
import usePartner from "@/lib/swr/use-partner";
import useWorkspace from "@/lib/swr/use-workspace";
import { EnrolledPartnerProps } from "@/lib/types";
import { CustomerRowItem } from "@/ui/customers/customer-row-item";
import {
  LoadingSpinner,
  Table,
  TimestampTooltip,
  buttonVariants,
  useTable,
} from "@dub/ui";
import { COUNTRIES, cn, currencyFormatter, formatDate } from "@dub/utils";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function ProgramPartnerCustomersPage() {
  const { partnerId } = useParams() as { partnerId: string };
  const { partner, error } = usePartner({ partnerId });

  return partner ? (
    <PartnerCustomers partner={partner} />
  ) : (
    <div className="flex justify-center py-16">
      {error ? (
        <span className="text-content-subtle text-sm">
          Failed to load partner customers
        </span>
      ) : (
        <LoadingSpinner />
      )}
    </div>
  );
}

function PartnerCustomers({ partner }: { partner: EnrolledPartnerProps }) {
  const { slug } = useWorkspace();

  const {
    customers,
    error: customersError,
    loading,
  } = useCustomers({
    query: {
      partnerId: partner.id,
      pageSize: 10,
      sortBy: "createdAt",
      sortOrder: "desc",
    },
  });

  const table = useTable({
    data: customers || [],
    loading: loading,
    error: customersError ? "Failed to load customers" : undefined,
    columns: [
      {
        header: "Customer",
        cell: ({ row }) => <CustomerRowItem customer={row.original} />,
      },
      {
        header: "Country",
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
        header: "Lifetime value",
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
    onRowClick: (row) =>
      window.open(`/${slug}/program/customers/${row.original.id}`, "_blank"),
    resourceName: (p) => `customer${p ? "s" : ""}`,
    sortBy: "createdAt",
    sortOrder: "desc",
    sortableColumns: ["saleAmount", "createdAt"],
    onSortChange: ({ sortBy, sortOrder }) =>
      window.open(
        `/${slug}/program/customers?partnerId=${partner.id}&sortBy=${sortBy}&sortOrder=${sortOrder}`,
        "_blank",
      ),
    thClassName: (id) =>
      cn(id === "total" && "[&>div]:justify-end", "border-l-0"),
    tdClassName: (id) => cn(id === "total" && "text-right", "border-l-0"),
    className: "[&_tr:last-child>td]:border-b-transparent",
    scrollWrapperClassName: "min-h-[40px]",
    emptyState: "No customers yet",
  } as any);

  return (
    <>
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-content-emphasis text-lg font-semibold">
          Customers
        </h2>
        {Boolean(customers?.length) && (
          <Link
            href={`/${slug}/program/customers?partnerId=${partner.id}`}
            target="_blank"
            className={cn(
              buttonVariants({ variant: "secondary" }),
              "flex h-7 items-center rounded-lg border px-2 text-sm",
            )}
          >
            View all
          </Link>
        )}
      </div>
      <div className="mt-4">
        {customers || customersError ? (
          <Table {...table} />
        ) : (
          <div className="flex justify-center py-16">
            <LoadingSpinner />
          </div>
        )}
      </div>
    </>
  );
}
