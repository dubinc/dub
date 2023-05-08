import { useState } from "react";
import { Copy, Tick } from "@/components/shared/icons";
import { toast } from "sonner";

export default function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setCopied(true);
        navigator.clipboard.writeText(url).then(() => {
          toast.success("Copied shortlink to clipboard!");
        });
        setTimeout(() => setCopied(false), 3000);
      }}
      className="group rounded-full bg-gray-100 p-1.5 transition-all duration-75 hover:scale-105 hover:bg-blue-100 active:scale-95"
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
