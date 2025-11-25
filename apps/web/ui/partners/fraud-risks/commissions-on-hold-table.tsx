import useWorkspace from "@/lib/swr/use-workspace";
import { CommissionResponse, fraudEventGroupProps } from "@/lib/types";
import { COMMISSIONS_MAX_PAGE_SIZE } from "@/lib/zod/schemas/commissions";
import { CustomerRowItem } from "@/ui/customers/customer-row-item";
import {
  LoadingSpinner,
  Table,
  TimestampTooltip,
  useTable,
  useTablePagination,
} from "@dub/ui";
import {
  cn,
  currencyFormatter,
  fetcher,
  formatDateTimeSmart,
  nFormatter,
} from "@dub/utils";
import { useState } from "react";
import useSWR from "swr";
import { CommissionTypeBadge } from "../commission-type-badge";

export function CommissionsOnHoldTable({
  fraudEventGroup,
}: {
  fraudEventGroup: fraudEventGroupProps;
}) {
  const workspace = useWorkspace();
  const { id: workspaceId, slug } = workspace;

  const [page, setPage] = useState(1);

  const { pagination, setPagination } = useTablePagination({
    pageSize: COMMISSIONS_MAX_PAGE_SIZE,
    page,
    onPageChange: setPage,
  });

  const query = {
    workspaceId: workspaceId!,
    status: "pending",
    partnerId: fraudEventGroup.partner.id,
    page: page.toString(),
  };

  const {
    data: commissions,
    error,
    isLoading,
  } = useSWR<CommissionResponse[]>(
    `/api/commissions?${new URLSearchParams(query).toString()}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  const { data: commissionsCount } = useSWR<{ all: { count: number } }>(
    `/api/commissions/count?${new URLSearchParams(query).toString()}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  const table = useTable<CommissionResponse>({
    data: commissions || [],
    columns: [
      {
        id: "createdAt",
        header: "Date",
        cell: ({ row }) => (
          <TimestampTooltip
            timestamp={row.original.createdAt}
            side="right"
            rows={["local", "utc", "unix"]}
            delayDuration={150}
          >
            <p>{formatDateTimeSmart(row.original.createdAt)}</p>
          </TimestampTooltip>
        ),
      },
      {
        id: "customer",
        header: "Customer",
        cell: ({ row }) =>
          row.original.customer ? (
            <CustomerRowItem
              customer={row.original.customer}
              href={`/${slug}/customers/${row.original.customer.id}`}
            />
          ) : (
            "-"
          ),
      },
      {
        id: "type",
        header: "Type",
        accessorKey: "type",
        cell: ({ row }) => (
          <CommissionTypeBadge type={row.original.type ?? "sale"} />
        ),
        meta: {
          filterParams: ({ row }) => ({
            type: row.original.type,
          }),
        },
      },
      {
        id: "amount",
        header: "Amount",
        accessorFn: (d) =>
          d.type === "sale"
            ? currencyFormatter(d.amount)
            : nFormatter(d.quantity),
      },
      {
        id: "commission",
        header: "Commission",
        cell: ({ row }) => (
          <span
            className={cn(
              row.original.earnings < 0 && "text-red-600",
              "truncate",
            )}
          >
            {currencyFormatter(row.original.earnings)}
          </span>
        ),
      },
    ],
    ...((commissionsCount?.all.count || 0) > COMMISSIONS_MAX_PAGE_SIZE
      ? {
          pagination,
          onPaginationChange: setPagination,
        }
      : {
          className: "[&_tr:last-child>td]:border-b-transparent",
        }),
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    scrollWrapperClassName: "min-h-0",
    resourceName: (p) => `commission${p ? "s" : ""}`,
    rowCount: commissionsCount?.all.count || 0,
    loading: isLoading,
    error: error ? "Failed to load commissions" : undefined,
  });

  return (
    <div className="flex flex-col gap-3">
      {commissions?.length ? (
        <Table {...table} />
      ) : (
        <div className="border-border-subtle flex h-24 flex-col items-center justify-center gap-2 rounded-lg border">
          {isLoading ? (
            <LoadingSpinner />
          ) : (
            <p className="text-content-subtle text-sm">
              No commissions are on hold yet
            </p>
          )}
        </div>
      )}
    </div>
  );
}
