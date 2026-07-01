"use client";

import { useEffect, useState } from "react";
import { PlatformIcon } from "../platform-icon";

// In case platform CDN thumbnails expire; fall back to the platform icon on load failure.
export function ContentThumbnail({
  thumbnail,
  platform,
}: {
  thumbnail: string | null;
  platform: string;
}) {
  const [hasImageError, setHasImageError] = useState(false);
  const thumbnailSrc = hasImageError ? null : thumbnail;

  // Rows recycle as the list re-renders, so clear a prior failure when the source
  // changes — otherwise a fresh/valid URL stays masked by an earlier load error.
  useEffect(() => {
    setHasImageError(false);
  }, [thumbnail]);

  return (
    <div className="bg-bg-subtle relative h-14 w-[88px] shrink-0 overflow-hidden rounded-lg">
      {thumbnailSrc ? (
        <img
          src={thumbnailSrc}
          alt=""
          className="size-full object-cover transition-transform duration-150 group-hover:scale-105"
          onError={() => setHasImageError(true)}
        />
      ) : (
        <div className="flex size-full items-center justify-center">
          <PlatformIcon platform={platform} className="size-5" />
        </div>
      )}
    </div>
  );
}
