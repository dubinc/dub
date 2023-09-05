"use client";

import { useState } from "react";
import { useDebounce } from "use-debounce";
import useSWR from "swr";
import { Copy, Tick } from "@/components/shared/icons";
import { fetcher, getUrlFromString } from "#/lib/utils";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";

export default function MetatagsContent() {
  const searchParams = useSearchParams();
  const url = searchParams?.get("url") || "https://github.com/steven-tey/dub";
  const [debouncedUrl] = useDebounce(getUrlFromString(url), 500);

  const { data } = useSWR<{
    title: string | null;
    description: string | null;
    image: string | null;
  }>(debouncedUrl && `/api/edge/metatags?url=${debouncedUrl}`, fetcher, {
    revalidateOnFocus: false,
  });

  const { title, description, image } = data || {};

  const [copied, setCopied] = useState(false);

  return (
    <>
      <button
        className="hover:bg/black-[0.08] group relative flex cursor-copy items-center space-x-5 rounded-full bg-black/5 py-2.5 pl-5 pr-3 transition-all"
        onClick={() => {
          navigator.clipboard.writeText(
            `https://api.dub.co/metatags?url=${getUrlFromString(url)}`,
          );
          setCopied(true);
          toast.success("Copied URL to clipboard!");
          setTimeout(() => {
            setCopied(false);
          }, 2000);
        }}
      >
        <div className="w-11/12 overflow-scroll scrollbar-hide">
          <p className="whitespace-nowrap text-sm font-medium text-gray-600">
            https://api.dub.co/metatags?url=
            <span className="text-amber-600">{getUrlFromString(url)}</span>
          </p>
        </div>
        <span className="absolute inset-y-0 right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-black/[0.07] transition-all group-hover:bg-black/10">
          {copied ? (
            <Tick className="h-4 w-4 text-gray-700" />
          ) : (
            <Copy className="h-4 w-4 text-gray-700" />
          )}
        </span>
      </button>

      <pre className="overflow-auto rounded-md border border-gray-400 bg-gray-800 p-5 text-left">
        <code className="text-xs text-white">
          {JSON.stringify(
            {
              title: title || null,
              description: description || null,
              image: image || null,
            },
            null,
            2,
          )}
        </code>
      </pre>
    </>
  );
}
