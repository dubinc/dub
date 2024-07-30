import { Button, Gear, Popover } from "@dub/ui";
import { cn } from "@dub/utils";
import { Table } from "@tanstack/react-table";
import { Command } from "cmdk";
import { useState } from "react";

export default function EditColumnsButton({ table }: { table: Table<any> }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover
      openPopover={isOpen}
      setOpenPopover={setIsOpen}
      content={
        <Command tabIndex={0} loop className="focus:outline-none">
          <Command.List className="flex w-screen flex-col gap-1 p-1 text-sm sm:w-auto sm:min-w-[130px]">
            {table
              .getAllColumns()
              .filter((c) => c.getCanHide())
              .map((column) => (
                <Command.Item
                  key={column.id}
                  className={cn(
                    "flex cursor-pointer select-none items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5",
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
      }
      align="end"
    >
      <Button
        type="button"
        className="h-8 whitespace-nowrap px-3"
        variant="secondary"
        icon={<Gear className="h-4 w-4 shrink-0" />}
        text="Edit columns"
      />
    </Popover>
  );
}
