"use client";

import { RAINBOW_CONIC_GRADIENT, RESOURCE_COLORS_DATA } from "@/ui/colors";
import { Popover, Tooltip } from "@dub/ui";
import { Check2 } from "@dub/ui/icons";
import { capitalize, cn } from "@dub/utils";
import { ComponentProps, MouseEvent, useEffect, useRef, useState } from "react";
import { HexColorInput, HexColorPicker } from "react-colorful";
import { useDebouncedCallback } from "use-debounce";

export type ColorPickerSwatch = {
  // The value passed to onChange when selected (hex code or named color)
  value: string;
  // Tooltip label
  name?: string;
  // Rendered swatch color; falls back to `value`
  hex?: string;
  // Tailwind background class alternative to `hex` (for named colors)
  className?: string;
};

export const COLOR_SWATCHES: ColorPickerSwatch[] = RESOURCE_COLORS_DATA.map(
  ({ color, hex }) => ({
    value: hex,
    name: capitalize(color)!,
    hex,
  }),
);

export const RESOURCE_COLOR_SWATCHES: ColorPickerSwatch[] =
  RESOURCE_COLORS_DATA.map(({ color, groupVariants }) => ({
    value: color,
    name: capitalize(color)!,
    className: groupVariants,
  }));

/**
 * Popover color picker with a circular trigger button.
 *
 * - `variant="full"`: gradient picker + swatches + hex input
 * - `variant="swatches"`: swatches only
 *
 * `showDefault` adds a leading rainbow swatch that selects `null` — callers
 * decide what "default" means (e.g. no brand color, or reset to black).
 */
export function ColorPicker({
  value,
  onChange,
  swatches = COLOR_SWATCHES,
  showDefault = false,
  variant = "full",
  side = "bottom",
  align = "end",
  debounceMs,
  id,
  className,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  swatches?: ColorPickerSwatch[];
  showDefault?: boolean;
  variant?: "full" | "swatches";
  side?: ComponentProps<typeof Popover>["side"];
  align?: ComponentProps<typeof Popover>["align"];
  debounceMs?: number;
  id?: string;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const pointerSelectRef = useRef(false);

  const onSelect = (value: string | null, e?: MouseEvent) => {
    // e.detail is 0 for keyboard-triggered clicks, >0 for pointer clicks
    pointerSelectRef.current = (e?.detail ?? 0) > 0;
    onChange(value);
    setIsOpen(false);
  };

  const triggerSwatch = value
    ? swatches.find((s) => s.value.toLowerCase() === value.toLowerCase())
    : undefined;
  const triggerHex = triggerSwatch?.className
    ? undefined
    : triggerSwatch?.hex ?? value ?? undefined;

  return (
    <Popover
      openPopover={isOpen}
      setOpenPopover={setIsOpen}
      side={side}
      align={align}
      popoverContentClassName="rounded-2xl"
      // On pointer selections, prevent Radix from refocusing the trigger on
      // close — Chrome treats the programmatic focus as :focus-visible after
      // keyboard input, leaving a stray focus ring on the trigger after
      // picking a color. Keyboard closes still restore focus to the trigger.
      onCloseAutoFocus={(e) => {
        if (pointerSelectRef.current) e.preventDefault();
        pointerSelectRef.current = false;
      }}
      content={
        <div className="p-4">
          <div className="sr-only" tabIndex={0}>
            Select a color
          </div>
          <ColorSelector
            value={value}
            onChange={onChange}
            onSelect={onSelect}
            swatches={swatches}
            showDefault={showDefault}
            showPicker={variant === "full"}
            showHexInput={variant === "full"}
            debounceMs={debounceMs}
          />
        </div>
      }
    >
      <button
        id={id}
        type="button"
        className={cn(
          "relative size-6 shrink-0 overflow-hidden rounded-full outline-none ring-black/10 transition-all duration-75",
          "shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)]",
          "hover:ring data-[state=open]:ring data-[state=open]:ring-black/20",
          "focus-visible:ring-1 focus-visible:ring-black/40 focus-visible:ring-offset-2",
          triggerSwatch?.className,
          className,
        )}
        style={triggerHex ? { backgroundColor: triggerHex } : undefined}
      >
        {!value && <Rainbow />}
      </button>
    </Popover>
  );
}

/**
 * The color selector panel body, composable outside the popover
 * (e.g. inline in a modal).
 */
export function ColorSelector({
  value,
  onChange,
  onSelect,
  swatches,
  showDefault = false,
  showPicker = false,
  showHexInput = false,
  debounceMs,
  id,
  className,
}: {
  value: string | null;
  // Continuous changes (gradient drag, hex typing)
  onChange: (value: string | null) => void;
  // Discrete selections (swatch clicks); defaults to onChange
  onSelect?: (value: string | null, e?: MouseEvent) => void;
  swatches?: ColorPickerSwatch[];
  showDefault?: boolean;
  showPicker?: boolean;
  showHexInput?: boolean;
  debounceMs?: number;
  id?: string;
  className?: string;
}) {
  const debouncedOnChange = useDebouncedCallback(
    (color: string) => onChange(color),
    debounceMs ?? 0,
  );
  const onPickerChange = debounceMs ? debouncedOnChange : onChange;

  // Flush any pending debounced change on unmount (e.g. the popover closing
  // mid-debounce) so the last gradient/hex change isn't lost
  useEffect(() => () => debouncedOnChange.flush(), [debouncedOnChange]);

  const onSwatchSelect = (value: string | null, e?: MouseEvent) => {
    // Drop any pending debounced change so it can't fire after (and overwrite)
    // this selection
    debouncedOnChange.cancel();
    onSelect ? onSelect(value, e) : onChange(value);
  };

  const hasSwatches = Boolean(showDefault || swatches?.length);

  return (
    <div className={cn("flex w-[262px] flex-col gap-5", className)}>
      <div className="flex flex-col gap-4">
        {showPicker && (
          <>
            <div
              className={cn(
                // react-colorful's BEM classes contain "__" which breaks
                // Tailwind arbitrary variants, hence the attribute selectors.
                // The hue track's class ends in "last-control"; "$=pointer"
                // matches both drag handles but not their inner pointer-fill.
                "[&_.react-colorful]:h-auto [&_.react-colorful]:w-full [&_.react-colorful]:gap-2.5",
                "[&_[class$=saturation]]:h-[120px] [&_[class$=saturation]]:overflow-hidden [&_[class$=saturation]]:rounded-lg [&_[class$=saturation]]:border-none [&_[class$=saturation]]:shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)]",
                "[&_[class$=last-control]]:h-2 [&_[class$=last-control]]:rounded-full",
                "[&_[class$=pointer]]:size-3.5 [&_[class$=pointer]]:border-[3px] [&_[class$=pointer]]:border-white [&_[class$=pointer]]:shadow-[0_0_0_2px_rgba(0,0,0,0.15)]",
              )}
            >
              <HexColorPicker
                color={value ?? "#000000"}
                onChange={onPickerChange}
              />
            </div>
            {hasSwatches && <div className="h-px w-full bg-neutral-200" />}
          </>
        )}
        {hasSwatches && (
          <div className="flex flex-wrap gap-2.5">
            {showDefault && (
              <Swatch
                name="Default"
                selected={!value}
                onSelect={(e) => onSwatchSelect(null, e)}
              />
            )}
            {swatches?.map((swatch) => (
              <Swatch
                key={swatch.value}
                swatch={swatch}
                name={swatch.name}
                selected={
                  !!value && swatch.value.toLowerCase() === value.toLowerCase()
                }
                onSelect={(e) => onSwatchSelect(swatch.value, e)}
              />
            ))}
          </div>
        )}
      </div>
      {showHexInput && (
        <HexInputField id={id} value={value} onChange={onPickerChange} />
      )}
    </div>
  );
}

function Swatch({
  swatch,
  name,
  selected,
  onSelect,
}: {
  // Undefined renders the rainbow "default" swatch
  swatch?: ColorPickerSwatch;
  name?: string;
  selected: boolean;
  onSelect: (e: MouseEvent) => void;
}) {
  const button = (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "relative flex size-6 items-center justify-center overflow-hidden rounded-full transition-all duration-75",
        "outline-none ring-black/10 hover:ring-4 focus-visible:ring-1 focus-visible:ring-black/40 focus-visible:ring-offset-2",
        swatch?.className,
      )}
      style={
        swatch && !swatch.className
          ? { backgroundColor: swatch.hex ?? swatch.value }
          : undefined
      }
    >
      {!swatch && <Rainbow />}
      {selected && (
        // Check2's path is filled, not stroked — stroking it in currentColor
        // is what thickens the check mark
        <Check2 className="relative size-3.5 stroke-current stroke-[1.5] text-white" />
      )}
    </button>
  );

  return name ? (
    <Tooltip content={name} delayDuration={1000} disableHoverableContent>
      <div className="w-fit rounded-full">{button}</div>
    </Tooltip>
  ) : (
    button
  );
}

export function HexInputField({
  value,
  onChange,
  id,
  className,
}: {
  value: string | null;
  onChange: (color: string) => void;
  id?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-10 w-full items-center gap-2.5 rounded-lg border border-neutral-200 bg-white px-3",
        "transition-colors focus-within:border-neutral-500",
        className,
      )}
    >
      <div
        className="relative size-4 shrink-0 overflow-hidden rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)]"
        style={value ? { backgroundColor: value } : undefined}
      >
        {!value && <Rainbow />}
      </div>
      <div className="flex min-w-0 grow items-center gap-1 text-sm">
        <span className="text-neutral-400">#</span>
        <HexColorInput
          id={id}
          name={id}
          color={value ?? undefined}
          onChange={onChange}
          placeholder="Default"
          className="w-full min-w-0 border-none bg-transparent p-0 text-sm text-neutral-800 placeholder-neutral-400 outline-none focus:ring-0"
        />
      </div>
    </div>
  );
}

const Rainbow = () => (
  <div
    className="absolute -inset-1/2 rounded-full blur-[2px]"
    style={{ backgroundImage: RAINBOW_CONIC_GRADIENT }}
  />
);
