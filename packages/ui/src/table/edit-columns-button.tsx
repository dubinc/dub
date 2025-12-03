import { cn } from "@dub/utils";
import { Table } from "@tanstack/react-table";
import { Command } from "cmdk";
import { useState } from "react";
import { Button } from "../button";
import { Gear } from "../icons";
import { Popover } from "../popover";
import { ScrollContainer } from "../scroll-container";

export function EditColumnsButton({ table }: { table: Table<any> }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover
      openPopover={isOpen}
      setOpenPopover={setIsOpen}
      content={
        <ScrollContainer className="max-h-[50vh]">
          <Command tabIndex={0} loop>
            <Command.List className="flex w-screen flex-col gap-1 p-1 text-sm focus-visible:outline-none sm:w-auto sm:min-w-[130px]">
              {table
                .getAllColumns()
                .filter((c) => c.getCanHide())
                .map((column) => (
                  <Command.Item
                    key={column.id}
                    className={cn(
                      "flex cursor-pointer select-none items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5",
                      "data-[selected=true]:bg-neutral-100",
                    )}
                    onSelect={() => column.toggleVisibility()}
                  >
                    <input
                      checked={column.getIsVisible()}
                      type="checkbox"
                      className="h-3 w-3 rounded-full border-neutral-300 text-black focus:outline-none focus:ring-0"
                      disabled
                    />
                    {column.columnDef.header?.toString()}
                  </Command.Item>
                ))}
            </Command.List>
          </Command>
        </ScrollContainer>
      }
      align="end"
    >
      <Button
        type="button"
        className="h-8 whitespace-nowrap px-2"
        variant="outline"
        icon={<Gear className="h-4 w-4 shrink-0" />}
      />
    </Popover>
  );
}
