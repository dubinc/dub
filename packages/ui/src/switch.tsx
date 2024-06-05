"use client";

import { cn } from "@dub/utils";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { Dispatch, ReactNode, SetStateAction } from "react";
import { Tooltip } from "./tooltip";

export function Switch({
  fn,
  trackDimensions,
  thumbDimensions,
  thumbTranslate,
  checked = true,
  loading = false,
  disabled = false,
  disabledTooltip,
}: {
  fn?: Dispatch<SetStateAction<boolean>> | ((checked: boolean) => void);
  trackDimensions?: string;
  thumbDimensions?: string;
  thumbTranslate?: string;
  checked?: boolean;
  loading?: boolean;
  disabled?: boolean;
  disabledTooltip?: string | ReactNode;
}) {
  if (disabledTooltip) {
    return (
      <Tooltip content={disabledTooltip}>
        <div className="radix-state-checked:bg-gray-300 relative inline-flex h-4 w-8 flex-shrink-0 cursor-not-allowed rounded-full border-2 border-transparent bg-gray-200">
          <div className="h-3 w-3 transform rounded-full bg-white shadow-lg" />
        </div>
      </Tooltip>
    );
  }

  return (
    <SwitchPrimitive.Root
      checked={loading ? false : checked}
      name="switch"
      {...(fn && { onCheckedChange: fn })}
      disabled={disabled || loading}
      className={cn(
        "radix-state-checked:bg-blue-500 radix-state-unchecked:bg-gray-200 relative inline-flex h-4 w-8 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring focus-visible:ring-blue-500 focus-visible:ring-opacity-75",
        (disabled || loading) && "cursor-not-allowed",
        trackDimensions,
      )}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          `radix-state-checked:${thumbTranslate}`,
          "radix-state-unchecked:translate-x-0",
          `pointer-events-none h-3 w-3 translate-x-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out`,
          thumbDimensions,
          thumbTranslate,
        )}
      />
    </SwitchPrimitive.Root>
  );
}
