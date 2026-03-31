import { cn } from "@dub/utils";
import { Table } from "@tanstack/react-table";
import { ReactNode, useEffect, useState } from "react";
import { Checkbox } from "../checkbox";
import { useKeyboardShortcut } from "../hooks";

export function SelectionToolbar<T>({
  table,
  controls,
  className,
}: {
  table: Table<T>;
  controls?: (table: Table<T>) => ReactNode;
  className?: string;
}) {
  const selectedCount = table.getSelectedRowModel().rows.length;
  const [lastSelectedCount, setLastSelectedCount] = useState(0);

  useEffect(() => {
    if (selectedCount !== 0) setLastSelectedCount(selectedCount);
  }, [selectedCount]);

  useKeyboardShortcut("Escape", () => table.resetRowSelection(), {
    enabled: selectedCount > 0,
    priority: 2, // Take priority over clearing filters
    modal: false,
  });

  return (
    <div
      className={cn(
        "border-border-subtle w-full border-b bg-white",
        "transition-opacity duration-100",
        selectedCount > 0
          ? "pointer-events-auto opacity-100"
          : "pointer-events-none opacity-0",
        className,
      )}
      inert={selectedCount === 0}
    >
      <div className="flex h-11 items-center py-2.5 pr-2">
        <div className="relative flex h-full w-12 shrink-0 items-center justify-center">
          <button
            type="button"
            className="absolute inset-0 flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation();
              table.toggleAllRowsSelected();
            }}
            title="Select all"
          >
            <Checkbox
              className="border-border-default pointer-events-none size-4 rounded data-[state=checked]:bg-black data-[state=indeterminate]:bg-black"
              checked={
                table.getIsAllRowsSelected()
                  ? true
                  : table.getIsSomeRowsSelected()
                    ? "indeterminate"
                    : false
              }
            />
          </button>
        </div>
        <div className="flex min-w-0 items-center gap-2.5 pl-1">
          <span
            className={cn(
              "text-content-emphasis mr-2 text-sm font-medium tabular-nums transition-transform duration-150",
              selectedCount > 0 ? "translate-x-0" : "-translate-x-1",
            )}
          >
            {lastSelectedCount} selected
          </span>
          <div
            className={cn(
              "flex items-center gap-2 transition-transform duration-150",
              selectedCount > 0 ? "translate-x-0" : "-translate-x-1",
            )}
          >
            {controls?.(table)}
          </div>
        </div>
      </div>
    </div>
  );
}
