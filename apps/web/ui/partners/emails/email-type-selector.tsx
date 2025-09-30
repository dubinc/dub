"use client";

import { Popover } from "@dub/ui";
import { Megaphone, Workflow } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { Command } from "cmdk";
import { memo, useState } from "react";

export const EMAIL_TYPES = [
  {
    type: "campaign",
    icon: Megaphone,
    name: "Campaign",
    description: "Sent once manually",
    colorClassName: "text-green-700 bg-green-100",
  },
  {
    type: "automation",
    icon: Workflow,
    name: "Automation",
    description: "Triggered by an event",
    colorClassName: "text-blue-700 bg-blue-100",
  },
];

export const EmailTypeSelector = memo(function EmailTypeSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedType = EMAIL_TYPES.find((type) => type.type === value);

  if (!selectedType) {
    throw new Error("Invalid email type passed to TypeSelector");
  }

  return (
    <Popover
      openPopover={isOpen}
      setOpenPopover={setIsOpen}
      content={
        <Command
          className="p-1 focus:outline-none sm:min-w-[240px]"
          tabIndex={0}
          loop
        >
          <Command.List>
            {EMAIL_TYPES.sort((a) =>
              a.type === selectedType.type ? -1 : 1,
            ).map(({ type, icon: Icon, name, description, colorClassName }) => (
              <Command.Item
                key={type}
                onSelect={() => {
                  onChange(type);
                  setIsOpen(false);
                }}
                className="flex cursor-pointer items-center gap-2.5 rounded-md p-1 data-[selected=true]:bg-neutral-50"
              >
                <div
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-lg",
                    colorClassName,
                  )}
                >
                  <Icon className="size-5" />
                </div>
                <div className="flex flex-col text-neutral-700">
                  <span className="text-sm font-semibold">{name}</span>
                  <p className="text-xs">{description}</p>
                </div>
              </Command.Item>
            ))}
          </Command.List>
        </Command>
      }
      side="bottom"
      align="start"
    >
      <button
        type="button"
        className={cn(
          "text-content-default flex h-7 w-fit items-center gap-2 rounded-md border border-transparent bg-white px-1.5 text-sm",
          "hover:border-border-subtle data-[state=open]:border-border-subtle transition-colors duration-150 data-[state=open]:bg-neutral-100",
        )}
      >
        <div
          className={cn(
            selectedType.colorClassName,
            "flex size-5 items-center justify-center rounded",
          )}
        >
          <selectedType.icon className="size-3.5" />
        </div>
        {selectedType.name}
      </button>
    </Popover>
  );
});
