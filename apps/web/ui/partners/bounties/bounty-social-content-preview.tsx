"use client";

import {
  getSocialContentEmbedAspectRatio,
  getSocialContentEmbedUrl,
} from "@/lib/bounty/social-content";
import { resolveBountyDetails } from "@/lib/bounty/utils";
import { BountySubmissionProps, PartnerBountyProps } from "@/lib/types";
import { cn } from "@dub/utils";
import { useState } from "react";
import { PLATFORM_ICONS } from "./bounty-platform-icons";

interface BountySocialContentPreviewProps {
  bounty: Pick<PartnerBountyProps, "id" | "submissionRequirements">;
  submission: Pick<BountySubmissionProps, "urls"> | null | undefined;
}

export function BountySocialContentPreview({
  bounty,
  submission,
}: BountySocialContentPreviewProps) {
  const [loaded, setLoaded] = useState(false);

  const bountyInfo = resolveBountyDetails(bounty);

  const url = submission?.urls?.[0] ?? "";
  const platform = bountyInfo?.socialPlatform;

  if (!url || !platform) {
    return null;
  }

  const embedUrl = getSocialContentEmbedUrl({
    platform: platform.value,
    url,
  });

  if (!embedUrl) {
    return null;
  }

  const aspectClass = getSocialContentEmbedAspectRatio({
    platform: platform.value,
    url,
  });

  const PlatformIcon = PLATFORM_ICONS[platform.value];

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-2">
      {/* Channel row */}
      <div className="flex items-center gap-2 px-2 py-1">
        <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-neutral-100">
          <PlatformIcon className="size-3.5" />
        </div>
        <div className="min-w-0 flex-1" />
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-7 shrink-0 items-center rounded-lg border border-neutral-200 bg-white px-2.5 text-sm font-medium text-neutral-900"
        >
          View
        </a>
      </div>

      {/* Native embed */}
      <div
        className={cn(
          "relative flex max-h-[700px] w-full items-center justify-center overflow-hidden rounded-md border border-black/10",
          aspectClass,
        )}
      >
        {!loaded && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-neutral-100">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-600" />
          </div>
        )}
        <iframe
          src={embedUrl}
          title={`${platform.label} content preview`}
          aria-label={`${platform.label} content preview`}
          className={cn("absolute inset-0 size-full", !loaded && "opacity-0")}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
          onLoad={() => setLoaded(true)}
        />
      </div>
    </div>
  );
}
