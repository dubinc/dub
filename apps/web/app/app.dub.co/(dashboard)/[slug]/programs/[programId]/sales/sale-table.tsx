"use client";

import { generateRandomName } from "@/lib/names";
import {
  CustomerSchema,
  PartnerSchema,
  SaleSchema,
} from "@/lib/zod/schemas/partners";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import SimpleDateRangePicker from "@/ui/shared/simple-date-range-picker";
import {
  AnimatedSizeContainer,
  CircleCheck,
  CircleHalfDottedClock,
  CircleXmark,
  Filter,
  StatusBadge,
  Table,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import { MoneyBill2 } from "@dub/ui/src/icons";
import {
  currencyFormatter,
  DICEBEAR_AVATAR_URL,
  fetcher,
  formatDate,
} from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { z } from "zod";
import { useSaleFilters } from "./use-sale-filters";

const salesSchema = SaleSchema.and(
  z.object({
    customer: CustomerSchema,
    partner: PartnerSchema,
  }),
);

export const SaleStatusBadges = {
  pending: {
    label: "Pending",
    variant: "pending",
    className: "text-orange-600 bg-orange-100",
    icon: CircleHalfDottedClock,
  },
  reconciled: {
    label: "Reconciled",
    variant: "neutral",
    className: "text-neutral-600 bg-neutral-100",
    icon: CircleHalfDottedClock,
  },
  paid: {
    label: "Paid",
    variant: "success",
    className: "text-green-600 bg-green-100",
    icon: CircleCheck,
  },
  refunded: {
    label: "Refunded",
    variant: "warning",
    className: "text-red-600 bg-red-100",
    icon: CircleXmark,
  },
  duplicate: {
    label: "Duplicate",
    variant: "error",
    className: "text-red-600 bg-red-100",
    icon: CircleXmark,
  },
  fraud: {
    label: "Fraud",
    variant: "error",
    className: "text-red-600 bg-red-100",
    icon: CircleXmark,
  },
};

export function SaleTableBusiness({ limit }: { limit?: number }) {
  const { programId } = useParams();
  const { pagination, setPagination } = usePagination(limit);
  const { queryParams, searchParams } = useRouterStuff();

  const sortBy = searchParams.get("sort") || "createdAt";
  const order = searchParams.get("order") === "asc" ? "asc" : "desc";
  const status = searchParams.get("status");

  const {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveAll,
    searchQuery,
  } = useSaleFilters({
    interval: "30d",
    sortBy,
    order,
    ...(status && { status }),
  });

  // TODO: Add analytics
  const { data: analyticsData, error: analyticsError } = {
    data: { sales: 0 },
    error: null,
  };

  const { data: sales, error } = useSWR<z.infer<typeof salesSchema>[]>(
    `/api/programs/${programId}/sales?${searchQuery}`,
    fetcher,
  );

  const totalSalesCount = analyticsData?.sales ?? 0;
  const loading = (!sales || !analyticsData) && !error && !analyticsError;

  const table = useTable({
    data: sales?.slice(0, limit) || [],
    columns: [
      {
        id: "createdAt",
        header: "Date",
        accessorFn: (d) => formatDate(d.createdAt, { month: "short" }),
      },
      {
        header: "Customer",
        accessorFn: (d) =>
          d.customer.name || d.customer.email || generateRandomName(),
      },
      {
        header: "Partner",
        cell: ({ row }) => {
          return (
            <div className="flex items-center gap-2">
              <img
                src={
                  row.original.partner.logo ||
                  `${DICEBEAR_AVATAR_URL}${row.original.partner.name}`
                }
                alt={row.original.partner.name}
                className="size-5 rounded-full"
              />
              <div>{row.original.partner.name}</div>
            </div>
          );
        },
      },
      {
        id: "amount",
        header: "Amount",
        accessorFn: (d) =>
          currencyFormatter(d.amount / 100, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
      },
      {
        header: "Status",
        cell: ({ row }) => {
          const badge = SaleStatusBadges[row.original.status];

          return (
            <StatusBadge icon={null} variant={badge.variant}>
              {badge.label}
            </StatusBadge>
          );
        },
      },
    ],
    ...(!limit
      ? {
          pagination,
          onPaginationChange: setPagination,
          sortableColumns: ["createdAt", "amount"],
          sortBy,
          sortOrder: order,
          onSortChange: ({ sortBy, sortOrder }) =>
            queryParams({
              set: {
                ...(sortBy && { sort: sortBy }),
                ...(sortOrder && { order: sortOrder }),
                ...(status && { status }),
              },
            }),
        }
      : {}),
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    resourceName: (p) => `sale${p ? "s" : ""}`,
    rowCount: Math.max(totalSalesCount, sales?.length ?? 0),
    loading,
    error: error || analyticsError ? "Failed to load sales" : undefined,
  });

  return loading || sales?.length ? (
    <div className="flex flex-col gap-3">
      {!limit && (
        <div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            {loading ? (
              <>
                <div className="h-10 w-full animate-pulse rounded-md bg-neutral-200 md:w-24" />
                <div className="h-10 w-full animate-pulse rounded-md bg-neutral-200 md:w-32" />
              </>
            ) : (
              <>
                <Filter.Select
                  className="w-full md:w-fit"
                  filters={filters}
                  activeFilters={activeFilters}
                  onSelect={onSelect}
                  onRemove={onRemove}
                />
                <SimpleDateRangePicker className="w-full sm:min-w-[200px] md:w-fit" />
              </>
            )}
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
      )}
      <Table {...table} />
    </div>
  ) : (
    <AnimatedEmptyState
      title="No sales found"
      description="No sales have been made for this program yet."
      cardContent={() => (
        <>
          <MoneyBill2 className="size-4 text-neutral-700" />
          <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
        </>
      )}
    />
  );
}
