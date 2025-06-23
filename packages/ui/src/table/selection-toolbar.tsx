import { cn } from "@dub/utils";
import { Table } from "@tanstack/react-table";
import { ReactNode, useEffect, useState } from "react";

export function SelectionToolbar<T>({
  table,
  controls,
}: {
  table: Table<T>;
  controls?: (table: Table<T>) => ReactNode;
}) {
  const selectedCount = table.getSelectedRowModel().rows.length;
  const [lastSelectedCount, setLastSelectedCount] = useState(0);

  useEffect(() => {
    if (selectedCount !== 0) setLastSelectedCount(selectedCount);
  }, [selectedCount]);

  return (
    <tr
      className={cn("size-0")}
      {...{
        inert: table.getSelectedRowModel().rows.length ? undefined : "",
      }}
    >
      <td colSpan={table.getHeaderGroups().length} className="contents size-0">
        <div
          className={cn(
            "pointer-events-none absolute bottom-px left-11 right-0 top-0 bg-white opacity-0 duration-150",
            selectedCount && "pointer-events-auto opacity-100",
          )}
        >
          <div
            className={cn(
              "flex size-full -translate-x-1 items-center gap-2 transition-transform duration-150",
              selectedCount && "translate-x-0",
            )}
          >
            <span className="text-content-emphasis mr-2 text-sm font-medium">
              {lastSelectedCount} selected
            </span>
            {controls?.(table)}
          </div>
        </div>
      </td>
    </tr>
  );
}
