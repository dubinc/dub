import { cn, deepEqual, isClickOnInteractiveChild } from "@dub/utils";
import {
  Cell,
  Column,
  ColumnDef,
  ColumnPinningState,
  ColumnResizeMode,
  flexRender,
  getCoreRowModel,
  PaginationState,
  Row,
  RowSelectionState,
  Table as TableType,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";
import { AnimatePresence, motion } from "framer-motion";
import {
  CSSProperties,
  Dispatch,
  memo,
  MouseEvent,
  PropsWithChildren,
  ReactNode,
  SetStateAction,
  useEffect,
  useState,
} from "react";
import { Button } from "../button";
import { LoadingSpinner, SortOrder } from "../icons";

const tableCellClassName = (columnId: string, clickable?: boolean) =>
  cn([
    "py-2.5 text-left text-sm leading-6 whitespace-nowrap border-border-subtle px-4 relative",
    "border-l border-b",
    columnId === "menu" && "bg-bg-default border-l-transparent py-0 px-1",
    clickable && "group-hover/row:bg-bg-muted transition-colors duration-75",
  ]);

const resizingClassName = cn([
  "absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none",
  "bg-neutral-300/50",
  "opacity-0 group-hover/resize:opacity-100 hover:opacity-100",
  "group-hover/resize:bg-neutral-300 hover:bg-neutral-400",
  "transition-all duration-200",
  "-mr-px",
  "after:absolute after:right-0 after:top-0 after:h-full after:w-4 after:translate-x-1/2",
]);

type BaseTableProps<T> = {
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
  onRowClick?: (row: Row<T>, e: MouseEvent) => void;
  enableColumnResizing?: boolean;
  columnResizeMode?: ColumnResizeMode;

  // Row selection
  getRowId?: (row: T) => string;
  onRowSelectionChange?: (rows: Row<T>[]) => void;
  selectedRows?: RowSelectionState;

  // Table styles
  className?: string;
  containerClassName?: string;
  scrollWrapperClassName?: string;
  thClassName?: string | ((columnId: string) => string);
  tdClassName?: string | ((columnId: string) => string);
};

type UseTableProps<T> = BaseTableProps<T> &
  (
    | {
        pagination?: PaginationState;
        onPaginationChange?: Dispatch<SetStateAction<PaginationState>>;
        rowCount: number;
      }
    | { pagination?: never; onPaginationChange?: never; rowCount?: never }
  );

type TableProps<T> = BaseTableProps<T> &
  PropsWithChildren<{
    table: TableType<T>;
  }> &
  (
    | {
        pagination?: PaginationState;
        rowCount: number;
      }
    | { pagination?: never; rowCount?: never }
  );

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
    getRowId,
    enableColumnResizing = false,
    columnResizeMode = "onChange",
  } = props;

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    props.columnVisibility ?? {},
  );

  const [rowSelection, setRowSelection] = useState<RowSelectionState>(
    props.selectedRows ?? {},
  );

  useEffect(() => {
    props.onRowSelectionChange?.(table.getSelectedRowModel().rows);
  }, [rowSelection]);

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
      enableResizing: enableColumnResizing,
      ...defaultColumn,
    },
    getCoreRowModel: getCoreRowModel(),
    onPaginationChange,
    onColumnVisibilityChange: (visibility) => setColumnVisibility(visibility),
    onRowSelectionChange: setRowSelection,
    state: {
      pagination,
      columnVisibility,
      columnPinning: { left: [], right: [], ...columnPinning },
      rowSelection,
    },
    manualPagination: true,
    autoResetPageIndex: false,
    manualSorting: true,
    getRowId,
    enableColumnResizing,
    columnResizeMode,
  });

  return {
    ...props,
    columnVisibility,
    table,
    enableColumnResizing,
  };
}

// Memoized row component to prevent re-renders during column resizing
const ResizableTableRow = memo(
  function ResizableTableRow<T>({
    row,
    onRowClick,
    cellRight,
    tdClassName,
    table,
  }: {
    row: Row<T>;
    onRowClick?: (row: Row<T>, e: MouseEvent) => void;
    cellRight?: (cell: Cell<T, any>) => ReactNode;
    tdClassName?: string | ((columnId: string) => string);
    table: TableType<T>;
  }) {
    return (
      <tr
        key={row.id}
        className={cn(
          "group/row",
          onRowClick && "cursor-pointer select-none",
          // hacky fix: if there are more than 8 rows, remove the bottom border from the last row
          table.getRowModel().rows.length > 8 &&
            row.index === table.getRowModel().rows.length - 1 &&
            "[&_td]:border-b-0",
        )}
        onClick={
          onRowClick
            ? (e) => {
                // Ignore if click is on an interactive child
                if (isClickOnInteractiveChild(e)) return;
                onRowClick(row, e);
              }
            : undefined
        }
      >
        {row.getVisibleCells().map((cell) => (
          <td
            key={cell.id}
            className={cn(
              tableCellClassName(cell.column.id, !!onRowClick),
              "text-content-default group",
              getCommonPinningClassNames(
                cell.column,
                row.index === table.getRowModel().rows.length - 1,
              ),
              typeof tdClassName === "function"
                ? tdClassName(cell.column.id)
                : tdClassName,
            )}
            style={{
              width: cell.column.getSize(),
              ...getCommonPinningStyles(cell.column),
            }}
          >
            <div className="flex w-full items-center justify-between overflow-hidden truncate">
              <div className="min-w-0 shrink grow truncate">
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </div>
              {cellRight?.(cell)}
            </div>
          </td>
        ))}
      </tr>
    );
  },
  (prevProps, nextProps) => {
    // Only re-render if row data or selection state changes
    const prevRow = prevProps.row;
    const nextRow = nextProps.row;
    return (
      prevRow.original === nextRow.original &&
      prevRow.getIsSelected() === nextRow.getIsSelected()
    );
  },
) as <T>(props: {
  row: Row<T>;
  onRowClick?: (row: Row<T>, e: MouseEvent) => void;
  cellRight?: (cell: Cell<T, any>) => ReactNode;
  tdClassName?: string | ((columnId: string) => string);
  table: TableType<T>;
}) => JSX.Element;

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
  containerClassName,
  scrollWrapperClassName,
  thClassName,
  tdClassName,
  table,
  pagination,
  resourceName,
  onRowClick,
  rowCount,
  children,
  enableColumnResizing = false,
}: TableProps<T>) {
  return (
    <div
      className={cn(
        "border-border-subtle bg-bg-default relative rounded-xl border",
        containerClassName,
      )}
    >
      {(!error && !!data?.length) || loading ? (
        <div
          className={cn(
            "relative min-h-[400px] overflow-x-auto rounded-[inherit]",
            scrollWrapperClassName,
          )}
        >
          <table
            className={cn(
              [
                "group/table w-full border-separate border-spacing-0 transition-[border-spacing,margin-top]",
                "[&_tr>*:first-child]:border-l-transparent",
                "[&_tr>*:last-child]:border-r-transparent",
                "[&_tr>*:last-child]:border-r-transparent",
                "[&_th]:relative [&_th]:select-none",
                enableColumnResizing && "[&_th]:group/resize",
              ],
              className,
            )}
            style={{
              width: "100%",
              tableLayout: enableColumnResizing ? "fixed" : "auto",
              ...(enableColumnResizing && {
                minWidth: table
                  .getVisibleLeafColumns()
                  .reduce((acc, column) => acc + column.getSize(), 0),
              }),
            }}
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
                        colSpan={header.colSpan}
                        className={cn(
                          tableCellClassName(header.id),
                          "text-content-emphasis select-none font-medium",
                          getCommonPinningClassNames(
                            header.column,
                            !table.getRowModel().rows.length,
                          ),
                          typeof thClassName === "function"
                            ? thClassName(header.column.id)
                            : thClassName,
                          enableColumnResizing && "relative",
                        )}
                        style={{
                          ...(enableColumnResizing
                            ? { width: header.getSize() }
                            : {
                                minWidth: header.column.columnDef.minSize,
                                maxWidth: header.column.columnDef.maxSize,
                                width: header.column.columnDef.size || "auto",
                              }),
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
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext(),
                                )}
                            {isSortableColumn &&
                              sortBy === header.column.id && (
                                <SortOrder
                                  className="h-3 w-3 shrink-0"
                                  order={sortOrder || "desc"}
                                />
                              )}
                          </ButtonOrDiv>
                        </div>
                        {enableColumnResizing &&
                          header.column.getCanResize() &&
                          header.column.id !== "menu" && (
                            <div
                              onMouseDown={header.getResizeHandler()}
                              onTouchStart={header.getResizeHandler()}
                              onClick={(e) => e.stopPropagation()}
                              className={resizingClassName}
                            />
                          )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) =>
                enableColumnResizing ? (
                  <ResizableTableRow
                    key={row.id}
                    row={row}
                    onRowClick={onRowClick}
                    cellRight={cellRight}
                    tdClassName={tdClassName}
                    table={table}
                  />
                ) : (
                  <tr
                    key={row.id}
                    className={cn(
                      "group/row",
                      onRowClick && "cursor-pointer select-none",
                      // hacky fix: if there are more than 8 rows, remove the bottom border from the last row
                      table.getRowModel().rows.length > 8 &&
                        row.index === table.getRowModel().rows.length - 1 &&
                        "[&_td]:border-b-0",
                    )}
                    onClick={
                      onRowClick
                        ? (e) => {
                            // Ignore if click is on an interactive child
                            if (isClickOnInteractiveChild(e)) return;
                            onRowClick(row, e);
                          }
                        : undefined
                    }
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className={cn(
                          tableCellClassName(cell.column.id, !!onRowClick),
                          "text-content-default group",
                          getCommonPinningClassNames(
                            cell.column,
                            row.index === table.getRowModel().rows.length - 1,
                          ),
                          typeof tdClassName === "function"
                            ? tdClassName(cell.column.id)
                            : tdClassName,
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
                ),
              )}
            </tbody>
          </table>
          {children}
        </div>
      ) : (
        <div className="text-content-subtle flex h-96 w-full items-center justify-center text-sm">
          {error ||
            emptyState ||
            `No ${resourceName?.(true) || "items"} found.`}
        </div>
      )}
      {pagination && !error && !!data?.length && !!rowCount && (
        <div className="border-border-subtle bg-bg-default text-content-default sticky bottom-0 mx-auto -mt-px flex w-full max-w-full items-center justify-between rounded-b-[inherit] border-t px-4 py-3.5 text-sm leading-6">
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
              // disabled={!table.getCanPreviousPage()}
              disabled={pagination.pageIndex === 1}
            />
            <Button
              variant="secondary"
              text="Next"
              className="h-7 px-2"
              onClick={() => table.nextPage()}
              // disabled={!table.getCanNextPage()}
              disabled={pagination.pageIndex === table.getPageCount()}
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
            className="bg-bg-default/50 absolute inset-0 flex h-[50vh] items-center justify-center rounded-xl"
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
