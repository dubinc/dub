"use client";

import { cn } from "@dub/utils";
import { LucideIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, Tick } from "./icons";

export function CopyButton({
  value,
  className,
  icon,
}: {
  value: string;
  className?: string;
  icon?: LucideIcon;
}) {
  const [copied, setCopied] = useState(false);
  const Comp = icon || Copy;
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setCopied(true);
        navigator.clipboard.writeText(value).then(() => {
          toast.success("Copied to clipboard!");
        });
        setTimeout(() => setCopied(false), 3000);
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
        <Comp className="text-gray-700 transition-all group-hover:text-blue-800" />
      )}
    </button>
  );
}
