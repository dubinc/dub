import {
  Cell,
  ColumnDef,
  ColumnPinningState,
  ColumnResizeMode,
  PaginationState,
  Row,
  RowSelectionState,
  Table as TableType,
  VisibilityState,
} from "@tanstack/react-table";
import {
  Dispatch,
  HTMLAttributes,
  MouseEvent,
  PropsWithChildren,
  ReactNode,
  SetStateAction,
} from "react";

type BaseTableProps<T> = {
  columns: ColumnDef<T, any>[];
  data: T[];
  loading?: boolean;
  error?: string;
  emptyState?: ReactNode;
  resourceName?: (plural: boolean) => string;

  defaultColumn?: Partial<ColumnDef<T, any>>;
  columnPinning?: ColumnPinningState;
  cellRight?: (cell: Cell<T, any>) => ReactNode;

  // Sorting
  sortableColumns?: string[];
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSortChange?: (props: {
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }) => void;

  // Column resizing
  enableColumnResizing?: boolean;
  columnResizeMode?: ColumnResizeMode;

  // Column visibility
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: (visibility: VisibilityState) => void;

  // Row selection
  getRowId?: (row: T) => string;
  onRowSelectionChange?: (rows: Row<T>[]) => void;
  selectedRows?: RowSelectionState;
  selectionControls?: (table: TableType<T>) => ReactNode;

  // Misc. row props
  onRowClick?: (row: Row<T>, e: MouseEvent) => void;
  onRowAuxClick?: (row: Row<T>, e: MouseEvent) => void;
  rowProps?:
    | HTMLAttributes<HTMLTableRowElement>
    | ((row: Row<T>) => HTMLAttributes<HTMLTableRowElement>);

  // Table styles
  className?: string;
  containerClassName?: string;
  scrollWrapperClassName?: string;
  emptyWrapperClassName?: string;
  thClassName?: string | ((columnId: string) => string);
  tdClassName?: string | ((columnId: string, row: Row<T>) => string);
};

export type UseTableProps<T> = BaseTableProps<T> &
  (
    | {
        pagination?: PaginationState;
        onPaginationChange?: Dispatch<SetStateAction<PaginationState>>;
        rowCount: number;
      }
    | { pagination?: never; onPaginationChange?: never; rowCount?: never }
  );

export type TableProps<T> = BaseTableProps<T> &
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
