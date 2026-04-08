import useWorkspace from "@/lib/swr/use-workspace";
import { CommissionResponse } from "@/lib/types";
import { StatusBadge } from "@dub/ui";
import { currencyFormatter, formatDateTimeSmart, nFormatter } from "@dub/utils";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CommissionStatusBadges } from "../partners/commission-status-badges";

export function CustomerPartnerEarningsTable({
  commissions,
  totalCommissions,
  isLoading,
}: {
  commissions?: CommissionResponse[];
  totalCommissions?: number;
  isLoading?: boolean;
}) {
  const router = useRouter();
  const { customerId } = useParams();
  const { slug } = useWorkspace();

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
        cell: ({ getValue }) => <span>{currencyFormatter(getValue())}</span>,
      },
      {
        header: "Commission",
        accessorKey: "earnings",
        cell: ({ getValue }) => <span>{currencyFormatter(getValue())}</span>,
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

  return (
    <div className="overflow-x-auto">
      {isLoading ? (
        <div className="flex h-32 w-full animate-pulse bg-neutral-100" />
      ) : !commissions?.length ? (
        <div className="flex h-32 w-full items-center justify-center rounded-lg text-xs text-neutral-500">
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
              {table.getRowModel().rows.map((row) => {
                const href = `/${slug}/program/commissions/${row.original.id}`;

                return (
                  <tr
                    key={row.id}
                    className={
                      href
                        ? "cursor-pointer transition-colors hover:bg-neutral-50/80"
                        : undefined
                    }
                    onClick={(e) => {
                      if (!href) return;
                      if (e.metaKey || e.ctrlKey) window.open(href, "_blank");
                      else router.push(href);
                    }}
                    onAuxClick={(e) => {
                      if (!href || e.button !== 1) return;
                      e.preventDefault();
                      window.open(href, "_blank");
                    }}
                    onPointerEnter={() => {
                      if (href) router.prefetch(href);
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="truncate px-4 py-3">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex items-center gap-1 px-4 py-3 text-sm text-neutral-600">
            {commissions.length} of
            <Link
              href={`/${slug}/program/commissions?customerId=${customerId}`}
              className="flex items-center gap-1.5 font-medium text-neutral-700 hover:text-neutral-900"
            >
              {totalCommissions ? (
                nFormatter(totalCommissions, { full: true })
              ) : (
                <div className="size-3 animate-pulse rounded-md bg-neutral-100" />
              )}{" "}
              results
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
