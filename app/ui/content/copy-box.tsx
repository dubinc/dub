"use client";

import { useState } from "react";
import { Copy, Tick } from "@/components/shared/icons";
import { toast } from "sonner";

export default function CopyBox(props) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="not-prose rounded-xl border border-gray-200 bg-white p-4">
      <p>{props.title}</p>
      <div className="mt-1 flex w-full items-center justify-between rounded-md bg-gray-100 px-3 py-2">
        <div className="overflow-auto scrollbar-hide">
          <p className="whitespace-nowrap text-gray-600 sm:text-sm">
            {props.copy}
          </p>
        </div>
        <button
          type="button"
          className="pl-2"
          onClick={() => {
            navigator.clipboard.writeText(props.copy);
            setCopied(true);
            toast.success("Copied to clipboard");
            setTimeout(() => setCopied(false), 3000);
          }}
        >
          {copied ? (
            <Tick className="h-4 w-4 text-gray-500" />
          ) : (
            <Copy className="h-4 w-4 text-gray-500" />
          )}
        </button>
      </div>
    </div>
  );
}
