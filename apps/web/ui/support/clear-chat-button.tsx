"use client";

import { Popover } from "@dub/ui";
import { Trash } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { useState } from "react";

export function ClearChatButton({
  onConfirm,
  triggerClassName,
  iconClassName,
}: {
  onConfirm: () => void;
  triggerClassName?: string;
  iconClassName?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover
      openPopover={open}
      setOpenPopover={setOpen}
      side="bottom"
      align="end"
      forceDropdown
      content={
        <div className="p-3">
          <p className="text-sm font-medium text-neutral-800">
            Start a new conversation?
          </p>
          <p className="mt-0.5 text-xs text-neutral-500">
            Your current messages and selections will be cleared.
          </p>
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onConfirm();
              }}
              className="rounded-md bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700"
            >
              Clear
            </button>
          </div>
        </div>
      }
    >
      <button
        type="button"
        className={cn(
          "flex items-center justify-center rounded-lg transition-colors",
          triggerClassName,
        )}
        aria-label="Clear chat"
      >
        <Trash className={cn("shrink-0", iconClassName)} />
      </button>
    </Popover>
  );
}
