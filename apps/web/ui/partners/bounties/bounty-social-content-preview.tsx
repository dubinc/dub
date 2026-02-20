"use client";

import { getBountyInfo, getSocialContentEmbedUrl } from "@/lib/bounty/utils";
import {
  BountySocialPlatform,
  BountySubmissionProps,
  PartnerBountyProps,
} from "@/lib/types";
import { cn } from "@dub/utils";

interface BountySocialContentPreviewProps {
  bounty: Pick<PartnerBountyProps, "id" | "submissionRequirements">;
  submission: Pick<BountySubmissionProps, "urls"> | null | undefined;
}

function getSocialContentEmbedAspectRatio({
  platform,
  url,
}: {
  platform: BountySocialPlatform;
  url: string;
}): string {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;

    if (platform === "youtube") {
      return pathname.includes("/shorts/") ? "aspect-[9/16]" : "aspect-video";
    }

    if (platform === "tiktok") {
      return "aspect-[9/16]";
    }

    if (platform === "instagram") {
      return pathname.includes("/reel/") ? "aspect-[9/16]" : "aspect-square";
    }

    if (platform === "twitter") {
      return "aspect-[2/1]";
    }

    return "aspect-video";
  } catch {
    return "aspect-video";
  }
}

export function BountySocialContentPreview({
  bounty,
  submission,
}: BountySocialContentPreviewProps) {
  const bountyInfo = getBountyInfo(bounty);

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

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white p-2">
        <div
          className={cn(
            "relative mx-auto flex max-h-[700px] w-full items-center justify-center overflow-hidden rounded-lg",
            aspectClass,
          )}
        >
          <iframe
            src={embedUrl}
            className="absolute inset-0 size-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        </div>
      </div>
    </>
  );
}
