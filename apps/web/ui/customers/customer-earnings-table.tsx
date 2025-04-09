import { SaleEvent } from "@/lib/types";
import { currencyFormatter } from "@dub/utils";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import Link from "next/link";

export function CustomerEarningsTable({
  sales,
  totalSales,
  isLoading,
  viewAllHref,
}: {
  sales?: Pick<SaleEvent, "timestamp" | "eventName" | "saleAmount">[];
  totalSales?: number;
  isLoading?: boolean;
  viewAllHref?: string;
}) {
  const table = useReactTable({
    data: sales || [],
    columns: [
      {
        header: "Date",
        accessorFn: (d) => new Date(d.timestamp),
        enableHiding: false,
        minSize: 100,
        cell: ({ getValue }) => (
          <span>
            {getValue().toLocaleTimeString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "numeric",
              hour12: true,
            })}
          </span>
        ),
      },
      {
        header: "Event",
        accessorKey: "eventName",
      },
      {
        header: "Amount",
        accessorKey: "saleAmount",
        cell: ({ getValue }) => (
          <span>
            {currencyFormatter(getValue() / 100, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        ),
      },
    ],
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-x-auto">
      {isLoading ? (
        <div className="flex h-32 w-full animate-pulse rounded-lg border border-transparent bg-neutral-100" />
      ) : !sales?.length ? (
        <div className="border-border-subtle flex h-32 w-full items-center justify-center rounded-lg border text-xs text-neutral-500">
          {sales?.length === 0 ? "No earnings yet" : "Failed to load earnings"}
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
          {sales?.length && totalSales && viewAllHref && (
            <div className="mt-2 px-2 text-sm text-neutral-600">
              {sales.length} of{" "}
              <Link
                href={viewAllHref}
                className="font-medium text-neutral-700 hover:text-neutral-900"
              >
                {totalSales} results
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
