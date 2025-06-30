import { cn, deepEqual, isClickOnInteractiveChild } from "@dub/utils";
import {
  Column,
  flexRender,
  getCoreRowModel,
  Row,
  RowSelectionState,
  Table as TableType,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";
import { AnimatePresence, motion } from "framer-motion";
import {
  CSSProperties,
  HTMLAttributes,
  memo,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Button } from "../button";
import { Checkbox } from "../checkbox";
import { LoadingSpinner, SortOrder } from "../icons";
import { SelectionToolbar } from "./selection-toolbar";
import { TableProps, UseTableProps } from "./types";

const tableCellClassName = (columnId: string, clickable?: boolean) =>
  cn([
    "py-2.5 text-left text-sm leading-6 whitespace-nowrap border-border-subtle px-4 relative",
    "border-l border-b",
    columnId === "select" && "py-0 pr-0 pl-2",
    columnId === "menu" && "bg-bg-default border-l-transparent py-0 px-1",
    clickable && "group-hover/row:bg-bg-muted transition-colors duration-75",
    "group-data-[selected=true]/row:bg-blue-50",
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

  const selectionEnabled =
    !!props.onRowSelectionChange || !!props.selectionControls;

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    props.columnVisibility ?? {},
  );

  const [rowSelection, setRowSelection] = useState<RowSelectionState>(
    props.selectedRows ?? {},
  );

  // Manually unset row selection if the row is no longer in the data
  // There doesn't seem to be a proper solution for this: https://github.com/TanStack/table/issues/4498
  useEffect(() => {
    if (!getRowId || !data) return;

    const entries = Object.entries(rowSelection);
    if (entries.length > 0) {
      const newEntries = entries.filter(([key]) =>
        data.find((row) => getRowId?.(row) === key),
      );

      if (newEntries.length !== entries.length)
        setRowSelection(Object.fromEntries(newEntries));
    }
  }, [data, rowSelection, getRowId]);

  useEffect(() => {
    if (props.selectedRows && !deepEqual(props.selectedRows, rowSelection)) {
      setRowSelection(props.selectedRows ?? {});
    }
  }, [props.selectedRows]);

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

  const tableColumns = useMemo(
    () => [
      ...(selectionEnabled
        ? [
            {
              id: "select",
              enableHiding: false,
              minSize: 30,
              size: 30,
              maxSize: 30,
              header: ({ table }: { table: TableType<T> }) => (
                <div className="flex size-full items-center justify-center">
                  <Checkbox
                    className="border-border-default size-4 rounded data-[state=checked]:bg-black data-[state=indeterminate]:bg-black"
                    checked={
                      table.getIsAllRowsSelected()
                        ? true
                        : table.getIsSomeRowsSelected()
                          ? "indeterminate"
                          : false
                    }
                    onCheckedChange={() => table.toggleAllRowsSelected()}
                    title="Select all"
                  />
                </div>
              ),
              cell: ({ row }: { row: Row<T> }) => (
                <div className="flex size-full items-center justify-center">
                  <Checkbox
                    className="border-border-default size-4 rounded data-[state=checked]:bg-black data-[state=indeterminate]:bg-black"
                    checked={row.getIsSelected()}
                    onCheckedChange={row.getToggleSelectedHandler()}
                    title="Select"
                  />
                </div>
              ),
            },
          ]
        : []),
      ...columns,
    ],
    [selectionEnabled, columns],
  );

  const table = useReactTable({
    data,
    rowCount,
    columns: tableColumns,
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

type ResizableTableRowProps<T> = {
  row: Row<T>;
  rowProps?: HTMLAttributes<HTMLTableRowElement>;
  table: TableType<T>;
} & Pick<TableProps<T>, "cellRight" | "tdClassName" | "onRowClick">;

// Memoized row component to prevent re-renders during column resizing
const ResizableTableRow = memo(
  function ResizableTableRow<T>({
    row,
    onRowClick,
    rowProps,
    cellRight,
    tdClassName,
    table,
  }: ResizableTableRowProps<T>) {
    const { className, ...rest } = rowProps || {};

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
          className,
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
        data-selected={row.getIsSelected()}
        {...rest}
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
) as <T>(props: ResizableTableRowProps<T>) => JSX.Element;

export function Table<T>({
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
  onRowSelectionChange,
  selectionControls,
  rowProps,
  rowCount,
  children,
  enableColumnResizing = false,
}: TableProps<T>) {
  const selectionEnabled = !!onRowSelectionChange || !!selectionControls;

  // Memoize table width calculation
  const tableWidth = useMemo(() => {
    if (!enableColumnResizing) return "100%";
    return table
      .getVisibleLeafColumns()
      .reduce((acc, column) => acc + column.getSize(), 0);
  }, [enableColumnResizing, table.getVisibleLeafColumns()]);

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
              minWidth: tableWidth,
            }}
          >
            <thead className="relative">
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
                          width: header.getSize(),
                          ...getCommonPinningStyles(header.column),
                        }}
                      >
                        <div className="flex items-center justify-between gap-6 !pr-0">
                          <ButtonOrDiv
                            className={cn(
                              "flex items-center gap-2",
                              header.column.id === "select" && "size-full",
                            )}
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
                          !["select", "menu"].includes(header.column.id) && (
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
              {selectionEnabled && (
                <SelectionToolbar table={table} controls={selectionControls} />
              )}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => {
                const props =
                  typeof rowProps === "function" ? rowProps(row) : rowProps;
                const { className, ...rest } = props || {};

                return enableColumnResizing ? (
                  <ResizableTableRow
                    key={`${row.id}-${table
                      .getVisibleLeafColumns()
                      .map((col) => col.id)
                      .join(",")}`}
                    row={row}
                    onRowClick={onRowClick}
                    rowProps={props}
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
                      table.getRowModel().rows.length > 8 &&
                        row.index === table.getRowModel().rows.length - 1 &&
                        "[&_td]:border-b-0",
                      className,
                    )}
                    onClick={
                      onRowClick
                        ? (e) => {
                            if (isClickOnInteractiveChild(e)) return;
                            onRowClick(row, e);
                          }
                        : undefined
                    }
                    data-selected={row.getIsSelected()}
                    {...rest}
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
                );
              })}
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
              {(
                (pagination.pageIndex - 1) * pagination.pageSize +
                1
              ).toLocaleString()}
              -
              {Math.min(
                (pagination.pageIndex - 1) * pagination.pageSize +
                  pagination.pageSize,
                table.getRowCount(),
              ).toLocaleString()}
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
            className="bg-bg-default/50 absolute inset-0 h-full"
          >
            <div className="flex h-[75vh] w-full items-center justify-center">
              <LoadingSpinner />
            </div>
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
