"use client";

import { Dispatch, ReactNode, SetStateAction } from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "#/lib/utils";
import Tooltip from "./tooltip";

const Switch = ({
  fn,
  trackDimensions,
  thumbDimensions,
  thumbTranslate,
  checked = true,
  disabled = false,
  disabledTooltip,
}: {
  fn: Dispatch<SetStateAction<boolean>> | (() => void);
  trackDimensions?: string;
  thumbDimensions?: string;
  thumbTranslate?: string;
  checked?: boolean;
  disabled?: boolean;
  disabledTooltip?: string | ReactNode;
}) => {
  if (disabledTooltip) {
    return (
      <Tooltip content={disabledTooltip}>
        <div className="relative inline-flex h-4 w-8 flex-shrink-0 cursor-not-allowed rounded-full border-2 border-transparent bg-gray-200 radix-state-checked:bg-gray-300">
          <div className="h-3 w-3 transform rounded-full bg-white shadow-lg" />
        </div>
      </Tooltip>
    );
  }

  return (
    <SwitchPrimitive.Root
      checked={checked}
      name="switch"
      onCheckedChange={(checked) => fn(checked)}
      disabled={disabled}
      className={cn(
        disabled
          ? "cursor-not-allowed radix-state-checked:bg-gray-300"
          : "cursor-pointer focus:outline-none focus-visible:ring focus-visible:ring-blue-500 focus-visible:ring-opacity-75 radix-state-checked:bg-blue-500 radix-state-unchecked:bg-gray-200",
        `relative inline-flex h-4 w-8 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out`,
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
};

export default Switch;
