"use client";

import { cn } from "@dub/utils";
import { toast } from "sonner";
import { useCopyToClipboard } from "./hooks";
import { Copy, Tick } from "./icons";

export function CopyButton({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const [copied, copyToClipboard] = useCopyToClipboard();

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        toast.promise(copyToClipboard(value), {
          loading: "Copying to clipboard...",
          success: "Copied to clipboard!",
          error: "Failed to copy",
        });
      }}
      className={cn(
        "group rounded-full bg-gray-100 p-1.5 transition-all duration-75 hover:scale-105 hover:bg-blue-100 active:scale-95",
        className,
      )}
    >
      <span className="sr-only">Copy</span>
      {copied ? (
        <Tick className="text-gray-700 transition-all group-hover:text-blue-800" />
      ) : (
        <Copy className="text-gray-700 transition-all group-hover:text-blue-800" />
      )}
    </button>
  );
}
