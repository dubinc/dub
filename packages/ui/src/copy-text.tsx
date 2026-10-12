"use client";

import { cn } from "@dub/utils";
import { ComponentPropsWithoutRef, forwardRef, ReactNode } from "react";
import { toast } from "sonner";
import { useCopyToClipboard } from "./hooks";

// Forwards its ref and props so it can be used as a Radix `asChild` trigger (e.g. inside a Tooltip)
export const CopyText = forwardRef<
  HTMLButtonElement,
  Omit<ComponentPropsWithoutRef<"button">, "value" | "children"> & {
    value: string;
    children: ReactNode;
    successMessage?: string;
  }
>(({ value, children, className, successMessage, onClick, ...rest }, ref) => {
  const [copied, copyToClipboard] = useCopyToClipboard();

  return (
    <button
      ref={ref}
      type="button"
      {...rest}
      onClick={(e) => {
        onClick?.(e);
        e.stopPropagation();
        toast.promise(copyToClipboard(value), {
          success: successMessage || "Copied to clipboard!",
        });
      }}
      className={cn(
        "cursor-copy text-sm text-neutral-700 decoration-dotted underline-offset-2 hover:underline",
        copied && "cursor-default",
        className,
      )}
    >
      {children}
    </button>
  );
});

CopyText.displayName = "CopyText";
