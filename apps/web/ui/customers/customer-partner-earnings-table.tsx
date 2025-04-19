import { CommissionResponse } from "@/lib/types";
import { StatusBadge } from "@dub/ui";
import { currencyFormatter, formatDateTimeSmart } from "@dub/utils";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import Link from "next/link";
import { CommissionStatusBadges } from "../partners/commission-status-badges";

export function CustomerPartnerEarningsTable({
  commissions,
  totalCommissions,
  isLoading,
  viewAllHref,
}: {
  commissions?: CommissionResponse[];
  totalCommissions?: number;
  isLoading?: boolean;
  viewAllHref?: string;
}) {
  const table = useReactTable({
    data: commissions || [],
    columns: [
      {
        header: "Date",
        accessorFn: (d) => new Date(d.createdAt),
        enableHiding: false,
        minSize: 100,
        cell: ({ getValue }) => <span>{formatDateTimeSmart(getValue())}</span>,
      },
      {
        header: "Sale Amount",
        accessorKey: "amount",
        cell: ({ getValue }) => (
          <span>
            {currencyFormatter(getValue() / 100, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        ),
      },
      {
        header: "Commission",
        accessorKey: "earnings",
        cell: ({ getValue }) => (
          <span>
            {currencyFormatter(getValue() / 100, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        ),
      },
      {
        header: "Status",
        cell: ({ row }) => {
          const badge = CommissionStatusBadges[row.original.status];

          return (
            <StatusBadge icon={null} variant={badge.variant}>
              {badge.label}
            </StatusBadge>
          );
        },
      },
    ],
    getCoreRowModel: getCoreRowModel(),
  });

  const As = viewAllHref ? Link : "div";
  return (
    <div className="overflow-x-auto">
      {isLoading ? (
        <div className="flex h-32 w-full animate-pulse rounded-lg border border-transparent bg-neutral-100" />
      ) : !commissions?.length ? (
        <div className="border-border-subtle flex h-32 w-full items-center justify-center rounded-lg border text-xs text-neutral-500">
          {commissions?.length === 0
            ? "No earnings yet"
            : "Failed to load earnings"}
        </div>
      ) : (
        <>
          <table className="[&_tr]:border-border-subtle w-full overflow-hidden text-left text-sm [&_tr]:border-b">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="p-2 font-semibold text-neutral-900"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="text-neutral-600">
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="truncate p-2">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-2 flex items-center gap-1 px-2 text-sm text-neutral-600">
            {commissions.length} of
            <As
              href={viewAllHref ?? "#"}
              className="flex items-center gap-1.5 font-medium text-neutral-700 hover:text-neutral-900"
            >
              {totalCommissions ?? (
                <div className="size-3 animate-pulse rounded-md bg-neutral-100" />
              )}{" "}
              results
            </As>
          </div>
        </>
      )}
    </div>
  );
}
