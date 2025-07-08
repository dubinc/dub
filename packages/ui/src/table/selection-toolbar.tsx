import { cn } from "@dub/utils";
import { Table } from "@tanstack/react-table";
import { ReactNode, useEffect, useState } from "react";
import { useKeyboardShortcut } from "../hooks";
import { Checkbox } from "../checkbox";
import { AnimatePresence, motion } from "framer-motion";

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

  // Animation variants for count and actions
  const rowVariants = {
    visible: {
      transition: { staggerChildren: 0.04, delayChildren: 0.02 },
    },
    hidden: {},
  };
  const itemVariants = {
    hidden: { opacity: 0, x: -4 },
    visible: { opacity: 1, x: 0 },
  };

  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className={cn(
            "pointer-events-auto absolute z-10 left-0 right-0 top-0 min-h-[40px] border-b border-border-subtle bg-white",
            className
          )}
          style={{ boxSizing: "border-box" }}
        >
          <div className="flex items-center gap-2.5 px-3.5 py-2 min-h-[40px]">
            <Checkbox
              className="border-border-default size-4 rounded data-[state=checked]:bg-black data-[state=indeterminate]:bg-black mr-2"
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
            <motion.span
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="text-content-emphasis text-sm font-medium tabular-nums mr-2"
            >
              {lastSelectedCount} selected
            </motion.span>
            <motion.div
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="flex items-center gap-2"
            >
              {controls?.(table)}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
