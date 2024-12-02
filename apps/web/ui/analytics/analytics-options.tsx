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
          "border-gray-200 bg-white text-gray-900 placeholder-gray-400",
          "focus-visible:border-gray-500 data-[state=open]:border-gray-500 data-[state=open]:ring-4 data-[state=open]:ring-gray-200",
        )}
      >
        <ThreeDots className="h-5 w-5 text-gray-500" />
      </button>
    </Popover>
  );
}
