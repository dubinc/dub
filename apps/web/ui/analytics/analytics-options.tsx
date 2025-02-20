import { Popover } from "@dub/ui";
import { cn } from "@dub/utils";
import { useState } from "react";
import { ThreeDots } from "../shared/icons";
import ExportButton from "./export-button";

export default function AnalyticsOptions() {
  const [openPopover, setOpenPopover] = useState(false);

  return (
    <Popover
      align="end"
      content={
        <div className="grid w-screen gap-px p-2 sm:w-48">
          <ExportButton setOpenPopover={setOpenPopover} />
        </div>
      }
      openPopover={openPopover}
      setOpenPopover={setOpenPopover}
    >
      <button
        onClick={() => setOpenPopover(!openPopover)}
        className={cn(
          "flex h-10 items-center rounded-md border px-1.5 outline-none transition-all",
          "border-neutral-200 bg-white text-neutral-900 placeholder-neutral-400",
          "focus-visible:border-neutral-500 data-[state=open]:border-neutral-500 data-[state=open]:ring-4 data-[state=open]:ring-neutral-200",
        )}
      >
        <ThreeDots className="h-5 w-5 text-neutral-500" />
      </button>
    </Popover>
  );
}
