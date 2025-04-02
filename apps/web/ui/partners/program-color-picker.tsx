"use client";

import { Popover, Tooltip } from "@dub/ui";
import { cn } from "@dub/utils";
import { CSSProperties, useState } from "react";

const RAINBOW_CONIC_GRADIENT =
  "conic-gradient(in hsl, #ee535d 0deg, #e9d988 90deg, #9fe0b8 180deg, #bf87e4 270deg, #ee535d 360deg)";

const COLORS = [
  { color: "#737373", name: "Gray" },
  { color: "#FB2C36", name: "Red" },
  { color: "#FF6900", name: "Orange" },
  { color: "#FD9A00", name: "Amber" },
  { color: "#EFB100", name: "Yellow" },
  { color: "#7CCF00", name: "Lime" },
  { color: "#00C951", name: "Green" },
  { color: "#00BC7D", name: "Emerald" },
  { color: "#00BBA7", name: "Teal" },
  { color: "#00B8DB", name: "Cyan" },
  { color: "#00A6F4", name: "Sky" },
  { color: "#2B7FFF", name: "Blue" },
  { color: "#615FFF", name: "Indigo" },
  { color: "#8E51FF", name: "Violet" },
  { color: "#AD46FF", name: "Purple" },
  { color: "#E12AFB", name: "Fuchsia" },
  { color: "#F6339A", name: "Pink" },
  { color: "#FF2056", name: "Rose" },
];

export function ProgramColorPicker({
  color,
  onChange,
  id,
}: {
  color: string | null;
  onChange: (color: string | null) => void;
  id?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const onSelect = (color: string | null) => {
    onChange(color);
    setIsOpen(false);
  };

  return (
    <Popover
      openPopover={isOpen}
      setOpenPopover={setIsOpen}
      popoverContentClassName="-mt-4"
      content={
        <div className="grid grid-cols-6 gap-3 p-4">
          <div className="sr-only" tabIndex={0}>
            Select a color
          </div>
          <div className="col-span-6">
            <Swatch
              color={null}
              name="Rainbow"
              onSelect={() => onSelect(null)}
            />
          </div>
          {COLORS.map(({ color, name }) => (
            <Swatch
              key={color}
              color={color}
              name={name}
              onSelect={() => onSelect(color)}
            />
          ))}
        </div>
      }
      side="right"
      align="start"
    >
      <button
        id={id}
        type="button"
        className={cn(
          "relative size-7 overflow-hidden rounded-full outline-none ring-black/10 transition-all duration-75",
          "hover:ring focus:ring data-[state=open]:ring data-[state=open]:ring-black/20",
          "focus-visible:ring-1 focus-visible:ring-black/40 focus-visible:ring-offset-2",
        )}
        style={{
          backgroundColor: color ?? undefined,
        }}
      >
        {!color && <Rainbow />}
      </button>
    </Popover>
  );
}

function Swatch({
  color,
  name,
  onSelect,
}: {
  color: string | null;
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
            "relative block size-6 overflow-hidden rounded-full ring-transparent ring-offset-2 transition-all duration-75",
            "hover:ring-1 hover:ring-[var(--ring-color)]",
            "outline-none focus-visible:ring-1 focus-visible:ring-[var(--ring-color)]",
          )}
          style={
            {
              backgroundColor: color ?? undefined,
              "--ring-color": color ?? "#404040",
            } as CSSProperties
          }
        >
          {!color && <Rainbow />}
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
