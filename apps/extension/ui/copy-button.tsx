import { cn } from "@dub/utils";
import { Check, Copy, LucideIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
    <div
      onClick={(e) => {
        e.stopPropagation();
        setCopied(true);
        navigator.clipboard.writeText(value).then(() => {
          toast.success("Copied to clipboard!");
        });
        setTimeout(() => setCopied(false), 3000);
      }}
      className={cn(
        "group rounded-full bg-gray-100 p-3 text-center transition-all duration-75 hover:scale-105 hover:bg-blue-100 active:scale-95",
        className,
      )}
    >
      <span className="sr-only">Copy</span>
      {copied ? (
        <Check className="h-3 w-3 text-gray-500 transition-all group-hover:text-gray-800" />
      ) : (
        <Comp className="h-3 w-3 text-gray-500 transition-all group-hover:text-gray-800" />
      )}
    </div>
  );
}
