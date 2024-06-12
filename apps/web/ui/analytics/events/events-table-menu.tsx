import { AnimatedSizeContainer, Popover, useMediaQuery } from "@dub/ui";
import { cn } from "@dub/utils";
import { Table } from "@tanstack/react-table";
import { Command } from "cmdk";
import { Ellipsis } from "lucide-react";
import { RefObject, useState } from "react";

export default function EventsTableMenu({
  table,
  scrollContainer,
}: {
  table: Table<any>;
  scrollContainer: RefObject<Element>;
}) {
  const { isMobile } = useMediaQuery();

  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover
      openPopover={isOpen}
      setOpenPopover={setIsOpen}
      collisionBoundary={scrollContainer.current ?? undefined}
      sticky="always"
      content={
        <AnimatedSizeContainer
          width={!isMobile}
          height
          className="rounded-[inherit]"
          style={{ transform: "translateZ(0)" }} // Fixes overflow on some browsers
        >
          <Command tabIndex={0} loop className="focus:outline-none">
            <Command.List className="flex w-screen flex-col gap-1 p-1 text-sm sm:w-auto sm:min-w-[130px]">
              {table
                .getAllColumns()
                .filter((c) => c.getCanHide())
                .map((column) => (
                  <Command.Item
                    key={column.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5",
                      "data-[selected=true]:bg-gray-100",
                    )}
                    onSelect={() => column.toggleVisibility()}
                  >
                    <input
                      checked={column.getIsVisible()}
                      type="checkbox"
                      className="h-3 w-3 rounded-full border-gray-300 text-black focus:outline-none focus:ring-0"
                      disabled
                    />
                    {column.columnDef.header?.toString()}
                  </Command.Item>
                ))}
            </Command.List>
          </Command>
        </AnimatedSizeContainer>
      }
      align="end"
    >
      <button
        type="button"
        className="flex h-6 w-6 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 active:text-gray-950"
      >
        <Ellipsis className="h-4 w-4" />
      </button>
    </Popover>
  );
}
