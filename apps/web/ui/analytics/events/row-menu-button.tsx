import { Button, Icon, Popover, useCopyToClipboard } from "@dub/ui";
import { Copy, Dots } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { Row } from "@tanstack/react-table";
import { Command } from "cmdk";
import { useState } from "react";
import { toast } from "sonner";
import { EventDatum } from "./events-table";

export function RowMenuButton({ row }: { row: Row<EventDatum> }) {
  const [isOpen, setIsOpen] = useState(false);
  const [, copyToClipboard] = useCopyToClipboard();
  return (
    <Popover
      openPopover={isOpen}
      setOpenPopover={setIsOpen}
      content={
        <Command tabIndex={0} loop className="focus:outline-none">
          <Command.List className="flex w-screen flex-col gap-1 p-1 text-sm sm:w-auto sm:min-w-[130px]">
            {"eventId" in row.original && (
              <MenuItem
                icon={Copy}
                label="Copy event ID"
                onSelect={() => {
                  if (!("eventId" in row.original)) return;
                  const eventId = row.original.eventId as string;
                  toast.promise(copyToClipboard(eventId), {
                    success: "Copied to clipboard",
                  });
                  setIsOpen(false);
                }}
              />
            )}
            <MenuItem
              icon={Copy}
              label="Copy click ID"
              onSelect={() => {
                const clickId = row.original.click_id as string;
                toast.promise(copyToClipboard(clickId), {
                  success: "Copied to clipboard",
                });
                setIsOpen(false);
              }}
            />
          </Command.List>
        </Command>
      }
      align="end"
    >
      <Button
        type="button"
        className="h-8 whitespace-nowrap px-2"
        variant="outline"
        icon={<Dots className="h-4 w-4 shrink-0" />}
      />
    </Popover>
  );
}

function MenuItem({
  icon: IconComp,
  label,
  onSelect,
}: {
  icon: Icon;
  label: string;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      className={cn(
        "flex cursor-pointer select-none items-center gap-2 whitespace-nowrap rounded-md px-3.5 py-2 text-sm text-neutral-950",
        "data-[selected=true]:bg-neutral-100",
      )}
      onSelect={onSelect}
    >
      <IconComp className="h-4 w-4 shrink-0 text-neutral-600" />
      {label}
    </Command.Item>
  );
}
