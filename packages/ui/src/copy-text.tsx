"use client";

import { cn } from "@dub/utils";
import { ReactNode } from "react";
import { toast } from "sonner";
import { useCopyToClipboard } from "./hooks";

export function CopyText({
  value,
  children,
  className,
  successMessage,
}: {
  value: string;
  children: ReactNode;
  className?: string;
  successMessage?: string;
}) {
  const [copied, copyToClipboard] = useCopyToClipboard();

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        toast.promise(copyToClipboard(value), {
          success: successMessage || "Copied to clipboard!",
        });
      }}
      type="button"
      className={cn(
        "cursor-copy text-sm text-neutral-700 decoration-dotted hover:underline",
        copied && "cursor-default",
        className,
      )}
    >
      {children}
    </button>
  );
}
