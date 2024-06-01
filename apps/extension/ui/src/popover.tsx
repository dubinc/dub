import { ReactNode } from "react";

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
    <div className="relative inline-block w-full min-w-[140px] max-w-[400px]">
      <div onClick={handleTogglePopover}>{children}</div>
      {openPopover && (
        <div className={`absolute z-50 w-full ${alignItem}`}>
          <div className="rounded-lg border border-gray-200 bg-white shadow-lg">
            <div className="px-4 py-2">{content}</div>
          </div>
        </div>
      )}
    </div>
  );
}
