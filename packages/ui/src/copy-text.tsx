"use client";

import { cn } from "@dub/utils";
import { ReactNode, useState } from "react";
import { toast } from "sonner";

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
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setCopied(true);
        navigator.clipboard.writeText(value).then(() => {
          toast.success(successMessage || "Copied to clipboard!");
        });
        setTimeout(() => setCopied(false), 3000);
      }}
      type="button"
      className={cn(
        "cursor-copy text-sm text-gray-700 decoration-dotted hover:underline",
        copied && "cursor-default",
        className,
      )}
    >
      {children}
    </button>
  );
}
