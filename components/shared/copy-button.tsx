import { useState } from "react";
import { Copy, Tick } from "@/components/shared/icons";

export default function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        setCopied(true);
        navigator.clipboard.writeText(url);
        setTimeout(() => setCopied(false), 3000);
      }}
      className="group p-1.5 rounded-full bg-gray-100 hover:bg-blue-100 hover:scale-105 active:scale-95 transition-all duration-75 dark:bg-slate-700 dark:hover:bg-blue-800/75"
    >
      <span className="sr-only">Copy</span>
      {copied ? (
        <Tick className="text-gray-700 dark:text-gray-100 group-hover:text-blue-800 dark:group-hover:text-blue-200 transition-all" />
      ) : (
        <Copy className="text-gray-700 dark:text-gray-100 group-hover:text-blue-800 dark:group-hover:text-blue-200 transition-all" />
      )}
    </button>
  );
}
