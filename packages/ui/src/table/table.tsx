import { cn } from "@dub/utils";
import {
  Cell,
  ColumnDef,
  PaginationState,
  Table as TableType,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { VariantProps, cva } from "class-variance-authority";
import { AnimatePresence, motion } from "framer-motion";
import {
  Dispatch,
  ReactNode,
  SetStateAction,
  createContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Button } from "../button";
import { LoadingSpinner, SortOrder } from "../icons";

const variantDefaults = { default: "", "compact-list": "", "loose-list": "" };

const tableVariants = cva(
  [
    "group/table w-full table-fixed border-separate transition-[border-spacing,margin-top] border-spacing-0",
  ],
  {
    variants: {
      variant: {
        ...variantDefaults,
        "loose-list": [
          "border-spacing-y-4 -mt-4",
          // Round left and right sides of each row
          "[&_tr>*:first-child]:rounded-l-xl",
          "[&_tr>*:last-child]:rounded-r-xl",
        ],
      },
    },
    compoundVariants: [
      {
        variant: ["loose-list", "compact-list"],
        className: [
          "[&_tr>*:first-child]:border-l [&_tr>*:last-child]:border-r",
        ],
      },
      {
        variant: ["default", "compact-list"],
        className: [
          // Remove side borders from table to avoid interfering with outer border
          "[&_tr>*:first-child]:border-l-transparent", // Left column
          "[&_tr>*:last-child]:border-r-transparent", // Right column
        ],
      },
    ],
  },
);

const tableWrapperVariants = cva("relative sm:rounded-xl", {
  variants: {
    variant: {
      ...variantDefaults,
      default: "border border-gray-200 bg-white",
      "compact-list": "border border-gray-200 bg-white",
    },
  },
});

const tableCellVariants = cva(
  "py-2.5 text-left text-sm leading-6 whitespace-nowrap border-gray-200 transition-[background-color]",
  {
    variants: {
      variant: {
        default: "border-r border-b", // Right and left borders, removed from outer columns above
        "compact-list": "border-b", // Bottom border, with other sides added above
        "loose-list": [
          "border-y bg-white px-2", // Top and bottom borders, with other sides added above

          // Outer cells have extra padding on the outside
          "[&:first-child]:pl-4",
          "[&:last-child]:pr-4",
        ],
      },
    },
    compoundVariants: [
      {
        variant: ["default", "compact-list"],
        className: "px-4",
      },
    ],
  },
);

const tableRowVariants = cva("group/row", {
  variants: {
    variant: {
      ...variantDefaults,
      "loose-list":
        "transition-[filter] hover:[filter:drop-shadow(0_8px_12px_#222A350d)_drop-shadow(0_32px_80px_#2f30370f)]",
    },
  },
});

const tablePaginationVariants = cva(
  "-mt-px sticky flex mx-auto items-center border-gray-200 justify-between bg-white px-4 py-3.5 text-sm leading-6 text-gray-600 transition-[max-width,width,bottom,filter]",
  {
    variants: {
      variant: {
        ...variantDefaults,
        "loose-list":
          "border rounded-xl [filter:drop-shadow(0_5px_8px_#222A351d)] bottom-4 max-w-[768px] w-full",
      },
    },
    compoundVariants: [
      {
        variant: ["default", "compact-list"],
        className: "rounded-b-[inherit] bottom-0 w-full border-t max-w-full",
      },
    ],
  },
);

export const TableContext = createContext<{
  variant: "default" | "compact-list" | "loose-list";
}>({ variant: "default" });

type UseTableProps<T> = VariantProps<typeof tableVariants> & {
  columns: ColumnDef<T, any>[];
  data: T[];
  loading?: boolean;
  error?: string;
  showColumnHeadings?: boolean;
  emptyState?: ReactNode;
  cellRight?: (cell: Cell<T, any>) => ReactNode;
  defaultColumn?: Partial<ColumnDef<T, any>>;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSortChange?: (props: {
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }) => void;
  sortableColumns?: string[];
  columnVisibility?: VisibilityState;
  resizeColumns?: boolean;
  resourceName?: (plural: boolean) => string;

  className?: string;
  thClassName?: string;
  tdClassName?: string;
} & (
    | {
        pagination: PaginationState;
        onPaginationChange?: Dispatch<SetStateAction<PaginationState>>;
        rowCount: number;
      }
    | { pagination?: never; onPaginationChange?: never; rowCount?: never }
  );

type TableProps<T> = UseTableProps<T> & {
  table: TableType<T>;
};

export function useTable<T extends any>(
  props: UseTableProps<T>,
): TableProps<T> & { table: TableType<T> } {
  const {
    data,
    rowCount,
    columns,
    defaultColumn,
    resizeColumns = true,
    pagination,
    onPaginationChange,
  } = props;

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    props.columnVisibility ?? {},
  );

  // Update internal columnVisibility when prop value changes
  useEffect(() => {
    setColumnVisibility(props.columnVisibility ?? {});
  }, [props.columnVisibility]);

  const table = useReactTable({
    data,
    rowCount,
    columns,
    defaultColumn: {
      minSize: 60,
      size: 150,
      maxSize: 250,
      ...defaultColumn,
    },
    columnResizeMode: resizeColumns ? "onChange" : undefined,
    getCoreRowModel: getCoreRowModel(),
    onPaginationChange,
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      pagination: pagination,
      columnVisibility,
    },
    manualPagination: true,
    autoResetPageIndex: false,
    manualSorting: true,
  });

  return {
    ...props,
    columnVisibility,
    resizeColumns,
    table,
  };
}

export function Table<T>({
  variant = "default",
  columns,
  data,
  loading,
  error,
  showColumnHeadings = true,
  emptyState,
  cellRight,
  sortBy,
  sortOrder,
  onSortChange,
  sortableColumns = [],
  resizeColumns,
  columnVisibility = {},
  className,
  thClassName,
  tdClassName,
  table,
  pagination,
  resourceName,
}: TableProps<T>) {
  // Memoize column sizes to pass to table as CSS variables
  const columnSizeVars = useMemo(() => {
    const headers = table.getFlatHeaders();
    const colSizes: { [key: string]: number } = {};
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i]!;
      colSizes[`--header-${header.id}-size`] = header.getSize();
      colSizes[`--col-${header.column.id}-size`] = header.column.getSize();
    }
    return colSizes;
  }, [
    columns,
    columnVisibility,
    table.getState().columnSizingInfo,
    table.getState().columnSizing,
  ]);

  return (
    <TableContext.Provider value={{ variant: variant ?? "default" }}>
      <div className={tableWrapperVariants({ variant })}>
        {(!error && !!data?.length) || loading ? (
          <div className="min-h-[400px] rounded-[inherit]">
            <table
              className={cn(tableVariants({ variant }), className)}
              style={columnSizeVars}
              data-variant={variant}
            >
              {showColumnHeadings && (
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => {
                        const isSortableColumn = sortableColumns.includes(
                          header.column.id,
                        );
                        return (
                          <th
                            key={header.id}
                            className={cn(
                              tableCellVariants({ variant }),
                              "relative select-none font-medium",
                              thClassName,
                            )}
                            style={{
                              width: `calc(var(--header-${header?.id}-size) * 1px)`,
                            }}
                          >
                            <div className="flex items-center justify-between gap-6 !pr-0">
                              <button
                                type="button"
                                className="flex items-center gap-2"
                                disabled={!isSortableColumn}
                                onClick={() =>
                                  onSortChange?.({
                                    sortBy: header.column.id,
                                    sortOrder:
                                      sortBy !== header.column.id
                                        ? "desc"
                                        : sortOrder === "asc"
                                          ? "desc"
                                          : "asc",
                                  })
                                }
                                aria-label="Sort by column"
                              >
                                <span>
                                  {header.isPlaceholder
                                    ? null
                                    : flexRender(
                                        header.column.columnDef.header,
                                        header.getContext(),
                                      )}
                                </span>
                                {isSortableColumn && (
                                  <SortOrder
                                    order={
                                      sortBy === header.column.id
                                        ? sortOrder || "desc"
                                        : null
                                    }
                                  />
                                )}
                              </button>
                            </div>
                            {resizeColumns && (
                              <div
                                className="absolute -right-[4px] top-0 z-[1] h-full w-[7px] cursor-col-resize"
                                {...{
                                  onDoubleClick: () =>
                                    header.column.resetSize(),
                                  onMouseDown: header.getResizeHandler(),
                                  onTouchStart: header.getResizeHandler(),
                                }}
                              />
                            )}
                          </th>
                        );
                      })}
                    </tr>
                  ))}
                </thead>
              )}
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className={tableRowVariants({ variant })}>
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className={cn(
                          tableCellVariants({ variant }),
                          "group relative text-gray-600",
                          tdClassName,
                        )}
                        style={{
                          width: `calc(var(--col-${cell.column.id}-size) * 1px)`,
                        }}
                      >
                        <div className="flex w-full items-center justify-between overflow-hidden truncate">
                          <div className="min-w-0 shrink grow">
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </div>
                          {cellRight?.(cell)}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex h-96 w-full items-center justify-center text-sm text-gray-500">
            {error || emptyState || "Failed to load data."}
          </div>
        )}
        {pagination && !error && (!loading || !!data?.length) && (
          <div className={tablePaginationVariants({ variant })}>
            <div>
              <span className="hidden sm:inline-block">Viewing</span>{" "}
              <span className="font-medium">
                {pagination.pageIndex * pagination.pageSize + 1}-
                {Math.min(
                  pagination.pageIndex * pagination.pageSize +
                    pagination.pageSize,
                  table.getRowCount(),
                )}
              </span>{" "}
              of{" "}
              <span className="font-medium">
                {table.getRowCount().toLocaleString()}
              </span>{" "}
              {resourceName?.(table.getRowCount() !== 1) || "items"}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                text="Previous"
                className="h-7 px-2"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              />
              <Button
                variant="secondary"
                text="Next"
                className="h-7 px-2"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              />
            </div>
          </div>
        )}

        {/* Loading overlay */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/50"
            >
              <LoadingSpinner />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </TableContext.Provider>
  );
}
