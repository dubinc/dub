import { cn } from "@dub/utils";
import { Table } from "@tanstack/react-table";
import { ReactNode, useEffect, useState } from "react";
import { useKeyboardShortcut } from "../hooks";
import { Checkbox } from "../checkbox";

export function SelectionToolbar<T>({
  table,
  controls,
  className,
  overlayWidth,
}: {
  table: Table<T>;
  controls?: (table: Table<T>) => ReactNode;
  className?: string;
  overlayWidth?: string | number;
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
        "pointer-events-auto w-full border-b border-border-subtle bg-white",
        "transition-transform duration-200 ease-out transition-opacity duration-200 ease-out",
        selectedCount > 0
          ? "opacity-100 translate-x-0 pointer-events-auto"
          : "opacity-0 -translate-x-full pointer-events-none",
        className
      )}
      style={overlayWidth ? { width: overlayWidth } : undefined}
    >
              <div className="flex items-center gap-2.5 px-2 py-2.5 h-11">
          <div className="flex items-center justify-center w-6">
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
          <span className={cn(
            "text-content-emphasis text-sm font-medium tabular-nums mr-2 transition-all duration-200 ease-out",
            selectedCount > 0
              ? "translate-x-0 opacity-100"
              : "-translate-x-1 opacity-0"
          )}>
            {lastSelectedCount} selected
          </span>
          <div className={cn(
            "flex items-center gap-2 transition-all duration-200 ease-out",
            selectedCount > 0
              ? "translate-x-0 opacity-100"
              : "-translate-x-1 opacity-0"
          )}>
            {controls?.(table)}
          </div>
        </div>
    </div>
  );
}
