"use client";

import { Button, GripDotsVertical, Plus2, Trash } from "@dub/ui";
import { cn } from "@dub/utils";
import {
  AnimatePresence,
  motion,
  Reorder,
  useDragControls,
} from "framer-motion";
import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useContext,
  useState,
} from "react";

const EditListContext = createContext<{
  expandedValue: string | null;
  setExpandedValue: Dispatch<SetStateAction<string | null>>;
}>({
  expandedValue: null,
  setExpandedValue: () => {},
});

export function EditList({
  values,
  onReorder,
  onAdd,
  addButtonLabel = "Add item",
  className,
  children,
}: {
  values: string[];
  onReorder: (newValues: string[]) => void;
  onAdd: () => string | void;
  addButtonLabel?: string;
  className?: string;
  children: ReactNode;
}) {
  const [expandedValue, setExpandedValue] = useState<string | null>(
    values.length === 1 ? values[0] : null,
  );

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Reorder.Group
        axis="y"
        values={values}
        onReorder={onReorder}
        layoutScroll
        className="flex flex-col gap-2"
      >
        <EditListContext.Provider value={{ expandedValue, setExpandedValue }}>
          <AnimatePresence initial={false}>{children}</AnimatePresence>
        </EditListContext.Provider>
      </Reorder.Group>
      <Button
        onClick={() => {
          const result = onAdd();
          if (result) setExpandedValue(result);
        }}
        variant="secondary"
        className="mt-2"
        icon={<Plus2 className="size-4" />}
        text={addButtonLabel}
      />
    </div>
  );
}

export function EditListItem({
  value,
  title,
  children,
  onRemove,
}: {
  value: string;
  title: ReactNode;
  children: ReactNode;
  onRemove?: () => void;
}) {
  const { expandedValue, setExpandedValue } = useContext(EditListContext);
  const controls = useDragControls();

  return (
    <Reorder.Item
      key={value}
      value={value}
      dragListener={false}
      dragControls={controls}
      className="relative overflow-hidden rounded-md border border-neutral-200 bg-neutral-50"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.15 }}
    >
      <div className="relative">
        <div
          onPointerDown={(e) => controls.start(e)}
          className="absolute inset-y-0 left-0 flex cursor-grab items-center px-2"
          data-handle
        >
          <GripDotsVertical className="size-4 text-neutral-800" />
        </div>
        <button
          type="button"
          onClick={() =>
            setExpandedValue((ev) => (ev === value ? null : value))
          }
          className="flex w-full select-none items-center gap-2 px-2 py-2.5 transition-colors hover:bg-neutral-100"
        >
          <div className="truncate px-6 text-sm font-semibold text-neutral-800">
            {title}
          </div>
        </button>
        {onRemove && (
          <button
            type="button"
            className="absolute inset-y-0 right-0 px-2.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
            onClick={onRemove}
            title="Remove item"
          >
            <Trash className="size-3.5" />
          </button>
        )}
      </div>
      <motion.div
        animate={{
          height: expandedValue === value ? "auto" : 0,
          overflow: "hidden",
        }}
        transition={{
          duration: 0.15,
        }}
        initial={false}
      >
        <div className="border-t border-neutral-200 p-5">{children}</div>
      </motion.div>
    </Reorder.Item>
  );
}
