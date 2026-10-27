"use client";

import { resolveBountyDetails } from "@/lib/bounty/utils";
import {
  BountySocialPlatform,
  BountySubmissionProps,
  PartnerBountyProps,
} from "@/lib/types";
import { cn } from "@dub/utils";
import { useState } from "react";

interface BountySocialContentPreviewProps {
  bounty: Pick<PartnerBountyProps, "id" | "submissionRequirements">;
  submission: Pick<BountySubmissionProps, "urls"> | null | undefined;
}

interface GetSocialContentEmbedUrlParams {
  platform: BountySocialPlatform;
  url: string;
}

interface GetSocialContentEmbedAspectRatioParams {
  platform: BountySocialPlatform;
  url: string;
}

function getSocialContentEmbedUrl({
  platform,
  url,
}: GetSocialContentEmbedUrlParams) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");

    if (platform === "youtube") {
      if (host === "youtu.be") {
        const id = parsed.pathname.slice(1).split("?")[0];
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }

      if (host === "youtube.com" || host === "m.youtube.com") {
        const v = parsed.searchParams.get("v");

        if (v) {
          return `https://www.youtube.com/embed/${v}`;
        }

        const shortsMatch = parsed.pathname.match(/\/shorts\/([^/?#]+)/);

        if (shortsMatch?.[1]) {
          return `https://www.youtube.com/embed/${shortsMatch[1]}`;
        }

        return null;
      }
    }

    if (platform === "instagram") {
      if (host === "instagram.com" || host === "m.instagram.com") {
        const pathMatch =
          parsed.pathname.match(/\/p\/([^/]+)/) ??
          parsed.pathname.match(/\/reel\/([^/]+)/);
        const shortcode = pathMatch?.[1];

        if (!shortcode) {
          return null;
        }

        const isReel = parsed.pathname.includes("/reel/");

        return isReel
          ? `https://www.instagram.com/reel/${shortcode}/embed/`
          : `https://www.instagram.com/p/${shortcode}/embed/`;
      }
    }

    if (platform === "tiktok") {
      if (
        host === "tiktok.com" ||
        host === "m.tiktok.com" ||
        host === "vm.tiktok.com"
      ) {
        const match = parsed.pathname.match(/\/video\/(\d+)/);
        const videoId = match?.[1];

        return videoId ? `https://www.tiktok.com/embed/v2/${videoId}` : null;
      }
    }

    if (platform === "twitter") {
      if (host === "twitter.com" || host === "x.com") {
        const statusMatch = parsed.pathname.match(/\/status\/(\d+)/);
        const tweetId = statusMatch?.[1];
        return tweetId
          ? `https://platform.twitter.com/embed/Tweet.html?id=${tweetId}`
          : null;
      }
    }

    if (platform === "linkedin") {
      if (host === "linkedin.com") {
        // LinkedIn post URLs:
        //   /posts/username_activity-{id}-xxxx
        //   /feed/update/urn:li:activity:{id}
        const activityMatch = parsed.pathname.match(/activity[_-](\d+)/);
        const urnMatch = parsed.pathname.match(/activity[:%]3A(\d+)/);
        const activityId = activityMatch?.[1] ?? urnMatch?.[1];

        return activityId
          ? `https://www.linkedin.com/embed/feed/update/urn:li:activity:${activityId}`
          : null;
      }
    }

    return null;
  } catch {
    return null;
  }
}

function getSocialContentEmbedAspectRatio({
  platform,
  url,
}: GetSocialContentEmbedAspectRatioParams) {
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
      return "aspect-square";
    }

    if (platform === "linkedin") {
      return "aspect-video";
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

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-2">
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
