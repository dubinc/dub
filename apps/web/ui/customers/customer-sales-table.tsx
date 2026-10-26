import { SaleEvent } from "@/lib/types";
import { TimestampTooltip } from "@dub/ui";
import { currencyFormatter, formatDateTimeSmart, nFormatter } from "@dub/utils";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import Link from "next/link";

type SalesTableRow = Pick<SaleEvent, "timestamp" | "eventName" | "saleAmount">;

export function CustomerSalesTable({
  sales,
  totalSales,
  isLoading,
  viewAllHref,
}: {
  sales?: SalesTableRow[];
  totalSales?: number;
  isLoading?: boolean;
  viewAllHref?: string;
}) {
  const table = useReactTable<SalesTableRow>({
    data: sales || [],
    columns: [
      {
        header: "Date",
        accessorFn: (d) => new Date(d.timestamp),
        enableHiding: false,
        minSize: 100,
        cell: ({ getValue }) => (
          <TimestampTooltip
            timestamp={getValue()}
            side="right"
            rows={["local", "utc", "unix"]}
          >
            <span>{formatDateTimeSmart(getValue())}</span>
          </TimestampTooltip>
        ),
      },
      {
        header: "Event",
        accessorKey: "eventName",
      },
      {
        header: "Amount",
        accessorFn: (d) => d.saleAmount ?? 0,
        cell: ({ getValue }) => <span>{currencyFormatter(getValue())}</span>,
      },
    ],
    getCoreRowModel: getCoreRowModel(),
  });

  const As = viewAllHref ? Link : "div";
  return (
    <div className="overflow-x-auto">
      {isLoading ? (
        <div className="flex h-32 w-full animate-pulse rounded-lg border border-transparent bg-neutral-100" />
      ) : !sales?.length ? (
        <div className="flex h-32 w-full items-center justify-center rounded-lg border border-transparent text-xs text-neutral-500">
          {sales?.length === 0 ? "No sales yet" : "Failed to load sales"}
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
                      className="px-4 py-3 font-semibold text-neutral-900"
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
                    <td key={cell.id} className="truncate px-4 py-3">
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
          <div className="flex items-center gap-1 px-4 py-3 text-sm text-neutral-600">
            {sales.length} of
            <As
              href={viewAllHref ?? "#"}
              className="flex items-center gap-1.5 font-medium text-neutral-700 hover:text-neutral-900"
            >
              {totalSales ? (
                nFormatter(totalSales, { full: true })
              ) : (
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
