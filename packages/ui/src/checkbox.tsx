"use client";

import * as CheckboxPrimitive from "@radix-ui/react-checkbox";

import { cn } from "@dub/utils";
import { forwardRef } from "react";
import { Check2, Minus } from "./icons";

const Checkbox = forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer h-5 w-5 shrink-0 rounded-md border border-neutral-200 bg-white outline-none focus-visible:border-black disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-blue-500 data-[state=indeterminate]:bg-blue-500",
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="group/indicator flex items-center justify-center text-white">
      <Check2 className="size-3 group-data-[state=indeterminate]/indicator:hidden" />
      <Minus className="size-3 group-data-[state=checked]/indicator:hidden" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
