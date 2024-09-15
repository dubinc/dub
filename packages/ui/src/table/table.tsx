import { cn, deepEqual } from "@dub/utils";
import {
  Cell,
  Column,
  ColumnDef,
  ColumnPinningState,
  PaginationState,
  Table as TableType,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { AnimatePresence, motion } from "framer-motion";
import {
  CSSProperties,
  Dispatch,
  PropsWithChildren,
  ReactNode,
  SetStateAction,
  useEffect,
  useState,
} from "react";
import { Button } from "../button";
import { LoadingSpinner, SortOrder } from "../icons";

const tableCellClassName = (columnId: string) =>
  cn([
    "py-2.5 text-left text-sm leading-6 whitespace-nowrap border-gray-200 px-4 relative",
    "border-l border-b",
    columnId === "menu" && "bg-white border-l-transparent py-0 px-1",
  ]);

type UseTableProps<T> = {
  columns: ColumnDef<T, any>[];
  data: T[];
  loading?: boolean;
  error?: string;
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
  onColumnVisibilityChange?: (visibility: VisibilityState) => void;
  columnPinning?: ColumnPinningState;
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

type TableProps<T> = UseTableProps<T> &
  PropsWithChildren<{
    table: TableType<T>;
  }>;

export function useTable<T extends any>(
  props: UseTableProps<T>,
): TableProps<T> & { table: TableType<T> } {
  const {
    data,
    rowCount,
    columns,
    defaultColumn,
    columnPinning,
    pagination,
    onPaginationChange,
  } = props;

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    props.columnVisibility ?? {},
  );

  // Update internal columnVisibility when prop value changes
  useEffect(() => {
    if (
      props.columnVisibility &&
      !deepEqual(props.columnVisibility, columnVisibility)
    )
      setColumnVisibility(props.columnVisibility ?? {});
  }, [props.columnVisibility]);

  // Call onColumnVisibilityChange when internal columnVisibility changes
  useEffect(() => {
    props.onColumnVisibilityChange?.(columnVisibility);
  }, [columnVisibility]);

  const table = useReactTable({
    data,
    rowCount,
    columns,
    defaultColumn: {
      minSize: 120,
      size: 0,
      maxSize: 300,
      ...defaultColumn,
    },
    getCoreRowModel: getCoreRowModel(),
    onPaginationChange,
    onColumnVisibilityChange: (visibility) => setColumnVisibility(visibility),
    state: {
      pagination: pagination,
      columnVisibility,
      columnPinning: { left: [], right: [], ...columnPinning },
    },
    manualPagination: true,
    autoResetPageIndex: false,
    manualSorting: true,
  });

  return {
    ...props,
    columnVisibility,
    table,
  };
}

export function Table<T>({
  columns,
  data,
  loading,
  error,
  emptyState,
  cellRight,
  sortBy,
  sortOrder,
  onSortChange,
  sortableColumns = [],
  className,
  thClassName,
  tdClassName,
  table,
  pagination,
  resourceName,
  rowCount,
  children,
}: TableProps<T>) {
  return (
    <div className="relative border border-gray-200 bg-white sm:rounded-xl">
      {(!error && !!data?.length) || loading ? (
        <div className="relative min-h-[400px] overflow-x-auto rounded-[inherit]">
          <table
            className={cn(
              [
                "group/table w-full border-separate border-spacing-0 transition-[border-spacing,margin-top]",
                // Remove side borders from table to avoid interfering with outer border
                "[&_tr>*:first-child]:border-l-transparent", // Left column
                "[&_tr>*:last-child]:border-r-transparent", // Right column
              ],
              className,
            )}
          >
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const isSortableColumn = sortableColumns.includes(
                      header.column.id,
                    );
                    const ButtonOrDiv = isSortableColumn ? "button" : "div";

                    return (
                      <th
                        key={header.id}
                        className={cn(
                          tableCellClassName(header.id),
                          "select-none font-medium",
                          getCommonPinningClassNames(
                            header.column,
                            !table.getRowModel().rows.length,
                          ),
                          thClassName,
                        )}
                        style={{
                          minWidth: header.column.columnDef.minSize,
                          maxWidth: header.column.columnDef.maxSize,
                          width: header.column.columnDef.size || "auto",
                          ...getCommonPinningStyles(header.column),
                        }}
                      >
                        <div className="flex items-center justify-between gap-6 !pr-0">
                          <ButtonOrDiv
                            className="flex items-center gap-2"
                            {...(isSortableColumn && {
                              type: "button",
                              disabled: !isSortableColumn,
                              "aria-label": "Sort by column",
                              onClick: () =>
                                onSortChange?.({
                                  sortBy: header.column.id,
                                  sortOrder:
                                    sortBy !== header.column.id
                                      ? "desc"
                                      : sortOrder === "asc"
                                        ? "desc"
                                        : "asc",
                                }),
                            })}
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
                          </ButtonOrDiv>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={cn(
                        tableCellClassName(cell.column.id),
                        "group text-gray-600",
                        getCommonPinningClassNames(
                          cell.column,
                          row.index === table.getRowModel().rows.length - 1,
                        ),
                        tdClassName,
                      )}
                      style={{
                        minWidth: cell.column.columnDef.minSize,
                        maxWidth: cell.column.columnDef.maxSize,
                        width: cell.column.columnDef.size || "auto",
                        ...getCommonPinningStyles(cell.column),
                      }}
                    >
                      <div className="flex w-full items-center justify-between overflow-hidden truncate">
                        <div className="min-w-0 shrink grow truncate">
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
          {children}
        </div>
      ) : (
        <div className="flex h-96 w-full items-center justify-center text-sm text-gray-500">
          {error ||
            emptyState ||
            `No ${resourceName?.(true) || "items"} found.`}
        </div>
      )}
      {pagination && !error && !!data?.length && !!rowCount && (
        <div className="sticky bottom-0 mx-auto -mt-px flex w-full max-w-full items-center justify-between rounded-b-[inherit] border-t border-gray-200 bg-white px-4 py-3.5 text-sm leading-6 text-gray-600">
          <div>
            <span className="hidden sm:inline-block">Viewing</span>{" "}
            <span className="font-medium">
              {(pagination.pageIndex - 1) * pagination.pageSize + 1}-
              {Math.min(
                (pagination.pageIndex - 1) * pagination.pageSize +
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
  );
}

const getCommonPinningClassNames = (
  column: Column<any>,
  isLastRow: boolean,
): string => {
  const isPinned = column.getIsPinned();
  return cn(
    isPinned &&
      !isLastRow &&
      "animate-table-pinned-shadow [animation-timeline:scroll(inline)]",
  );
};

const getCommonPinningStyles = (column: Column<any>): CSSProperties => {
  const isPinned = column.getIsPinned();

  return {
    left: isPinned === "left" ? `${column.getStart("left")}px` : undefined,
    right: isPinned === "right" ? `${column.getAfter("right")}px` : undefined,
    position: isPinned ? "sticky" : "relative",
  };
};
