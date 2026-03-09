"use client";

import { resolveBountyDetails } from "@/lib/bounty/utils";
import {
  BountySocialPlatform,
  BountySubmissionProps,
  PartnerBountyProps,
} from "@/lib/types";
import { cn } from "@dub/utils";
import { useState } from "react";
import { PLATFORM_ICONS } from "./bounty-platform-icons";

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

  const PlatformIcon = PLATFORM_ICONS[platform.value];

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-2">
      {/* Channel row */}
      {/* <div className="flex items-center gap-2 px-2 py-1">
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
      </div> */}

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
