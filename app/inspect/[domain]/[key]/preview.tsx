"use client";
import { fetcher, getDomainWithoutWWW } from "#/lib/utils";
import { LoadingCircle } from "#/ui/icons";
import { ImageOff } from "lucide-react";
import useSWR from "swr";

export default function LinkPreview({ url }: { url: string }) {
  const { data, isValidating } = useSWR<{
    title: string | null;
    description: string | null;
    image: string | null;
  }>(`/api/edge/metatags?url=${url}`, fetcher, {
    revalidateOnFocus: false,
  });

  const { title, description, image } = data || {};

  const hostname = getDomainWithoutWWW(url);

  return (
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
          <ImageOff className="h-8 w-8 text-gray-400" />
          <p className="text-sm text-gray-400">No OG image found.</p>
        </div>
      )}
      <div className="grid gap-1 bg-white p-3 text-left">
        <p className="text-sm text-[#536471]">{hostname}</p>
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
  );
}
