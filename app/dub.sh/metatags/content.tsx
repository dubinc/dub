"use client";

import { useMemo, useState } from "react";
import { useDebounce } from "use-debounce";
import useSWR from "swr";
import { Copy, Photo, Tick } from "@/components/shared/icons";
import { LoadingCircle } from "#/ui/icons";
import { fetcher, getDomainWithoutWWW, getUrlFromString } from "@/lib/utils";
import { toast } from "sonner";

export default function MetatagsContent() {
  const [url, setUrl] = useState("https://github.com/steven-tey/dub");
  const [debouncedUrl] = useDebounce(getUrlFromString(url), 500);
  const hostname = useMemo(() => {
    return getDomainWithoutWWW(debouncedUrl || "");
  }, [debouncedUrl]);

  const { data, isValidating } = useSWR<{
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
      <div className="w-full rounded-md shadow-sm">
        <input
          name="url"
          id="url"
          type="url"
          className="block w-full rounded-md border-gray-300 text-sm text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:outline-none focus:ring-gray-500"
          placeholder="Enter your URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          aria-invalid="true"
        />
      </div>

      <div className="relative overflow-hidden rounded-md border border-gray-300 bg-gray-50">
        {isValidating && (
          <div className="absolute flex h-[250px] w-full flex-col items-center justify-center space-y-4 border-b border-gray-300 bg-gray-50">
            <LoadingCircle />
          </div>
        )}
        {image ? (
          <img
            src={image}
            alt="Preview"
            className="h-[250px] w-full border-b border-gray-300 object-cover"
          />
        ) : (
          <div className="flex h-[250px] w-full flex-col items-center justify-center space-y-4 border-b border-gray-300">
            <Photo className="h-8 w-8 text-gray-400" />
            <p className="text-sm text-gray-400">
              Enter a link to generate a preview.
            </p>
          </div>
        )}
        <div className="grid gap-1 bg-white p-3 text-left">
          {hostname ? (
            <p className="text-sm text-[#536471]">{hostname}</p>
          ) : (
            <div className="mb-1 h-4 w-24 rounded-md bg-gray-100" />
          )}
          {title ? (
            <h3 className="truncate text-sm font-medium text-[#0f1419]">
              {title}
            </h3>
          ) : (
            <div className="mb-1 h-4 w-full rounded-md bg-gray-100" />
          )}
          {description ? (
            <p className="line-clamp-2 text-sm text-[#536471]">{description}</p>
          ) : (
            <div className="grid gap-2">
              <div className="h-4 w-full rounded-md bg-gray-100" />
              <div className="h-4 w-48 rounded-md bg-gray-100" />
            </div>
          )}
        </div>
      </div>

      <button
        className="hover:bg/black-[0.08] group relative flex cursor-copy items-center space-x-5 rounded-full bg-black/5 py-2.5 pl-5 pr-3 transition-all"
        onClick={() => {
          navigator.clipboard.writeText(
            `https://api.dub.sh/metatags?url=${getUrlFromString(url)}`,
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
            https://api.dub.sh/metatags?url=
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

      <pre className="overflow-auto rounded-md border border-gray-400 bg-stone-800 p-5 text-left">
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
