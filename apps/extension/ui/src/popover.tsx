import { ReactNode, useState } from "react";

interface PopoverProps {
  children: ReactNode;
  content: ReactNode | string;
  align?: "center" | "start" | "end";
  openPopover: boolean;
  setOpenPopover: (open: boolean) => void;
}

export default function Popover({
  children,
  content,
  align = "center",
  openPopover,
  setOpenPopover,
}: PopoverProps) {
  const handleTogglePopover = () => {
    setOpenPopover(!openPopover);
  };

  let alignItem = "";
  if (align === "start") {
    alignItem = "items-start";
  } else if (align === "end") {
    alignItem = "items-end";
  } else if (align === "center") {
    alignItem = "items-center";
  }

  return (
<div className="relative inline-block w-full max-w-[400px] min-w-[140px]">
      <div onClick={handleTogglePopover}>
        {children}
      </div>
      {openPopover && (
        <div className={`absolute z-50 w-full ${alignItem}`}>
          <div className="bg-white shadow-lg rounded-lg border border-gray-200">
            <div className="py-2 px-4">{content}</div>
          </div>
        </div>
      )}
    </div>
  );
}
