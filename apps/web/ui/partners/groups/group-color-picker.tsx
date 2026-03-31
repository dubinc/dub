"use client";

import {
  getResourceColorData,
  RAINBOW_CONIC_GRADIENT,
  RESOURCE_COLORS_DATA,
} from "@/ui/colors";
import { Popover, Tooltip } from "@dub/ui";
import { capitalize, cn } from "@dub/utils";
import { useState } from "react";

export function GroupColorPicker({
  color,
  onChange,
  id,
}: {
  color?: string | null;
  onChange: (color: string | null) => void;
  id?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const onSelect = (color: string | null) => {
    onChange(color);
    setIsOpen(false);
  };

  const colorClassName = color
    ? getResourceColorData(color)?.groupVariants
    : undefined;

  return (
    <Popover
      openPopover={isOpen}
      setOpenPopover={setIsOpen}
      content={
        <div className="flex items-center gap-3 p-2 sm:gap-2">
          <div className="sr-only" tabIndex={0}>
            Select a color
          </div>
          <Swatch
            name="Rainbow"
            colorClassName={null}
            onSelect={() => onSelect(null)}
          />
          {RESOURCE_COLORS_DATA.map(({ color, groupVariants }) => (
            <Swatch
              key={color}
              colorClassName={groupVariants}
              name={capitalize(color)!}
              onSelect={() => onSelect(color)}
            />
          ))}
        </div>
      }
      side="bottom"
      align="end"
    >
      <button
        id={id}
        type="button"
        className={cn(
          "relative size-5 overflow-hidden rounded-full outline-none ring-black/10 transition-all duration-75",
          "hover:ring focus:ring data-[state=open]:ring data-[state=open]:ring-black/20",
          "focus-visible:ring-1 focus-visible:ring-black/40 focus-visible:ring-offset-2",
          colorClassName,
        )}
      >
        {!colorClassName && <Rainbow />}
      </button>
    </Popover>
  );
}

function Swatch({
  colorClassName,
  name,
  onSelect,
}: {
  colorClassName: string | null;
  name: string;
  onSelect: () => void;
}) {
  return (
    <Tooltip content={name} delayDuration={1000} disableHoverableContent>
      <div className="w-fit rounded-full">
        <button
          type="button"
          onClick={onSelect}
          className={cn(
            "relative block size-7 overflow-hidden rounded-full ring-transparent ring-offset-2 transition-all duration-75 sm:size-5",
            "hover:ring-1 hover:ring-[var(--ring-color)]",
            "outline-none focus-visible:ring-1 focus-visible:ring-[var(--ring-color)]",
            colorClassName,
          )}
        >
          {!colorClassName && <Rainbow />}
        </button>
      </div>
    </Tooltip>
  );
}

const Rainbow = () => (
  <div
    className="absolute -inset-[50%] rounded-full blur-[2px]"
    style={{
      backgroundImage: RAINBOW_CONIC_GRADIENT,
    }}
  />
);
