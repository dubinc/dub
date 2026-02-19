"use client";

import { getBountyInfo, getSocialContentEmbedUrl } from "@/lib/bounty/utils";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import {
  BountySocialPlatform,
  BountySubmissionProps,
  PartnerBountyProps,
  SocialContent,
} from "@/lib/types";
import { useSocialContent } from "@/ui/partners/bounties/use-social-content";
import { ButtonLink } from "@/ui/placeholders/button-link";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNavBar,
} from "@dub/ui";
import { formatDate, truncate } from "@dub/utils";
import type { LucideIcon } from "lucide-react";
import { Instagram, Loader2, Music2, Tv, Youtube } from "lucide-react";
import { PropsWithChildren, useState } from "react";

const DESCRIPTION_MAX_LENGTH = 200;

const PLATFORM_ICONS: Record<BountySocialPlatform, LucideIcon> = {
  youtube: Youtube,
  twitter: Tv,
  tiktok: Music2,
  instagram: Instagram,
};

interface BountySocialContentPreviewProps {
  bounty: Pick<PartnerBountyProps, "id" | "submissionRequirements">;
  submission: Pick<BountySubmissionProps, "urls"> | null | undefined;
  authorOverride?: { name: string; imageUrl: string | null };
}

interface SocialContentPreviewContentProps {
  url: string;
  content: SocialContent | null;
  authorOverride?: { name: string; imageUrl: string | null };
}

interface ContentAuthorProps {
  url: string;
  platform: BountySocialPlatform;
  content: SocialContent | null;
  position?: "top" | "bottom";
  authorOverride?: { name: string; imageUrl: string | null };
}

interface ContentInfoProps {
  content: SocialContent | null;
}

export function BountySocialContentPreview({
  bounty,
  submission,
  authorOverride,
}: BountySocialContentPreviewProps) {
  const url = submission?.urls?.[0] ?? "";

  const bountyInfo = getBountyInfo(bounty);
  const platform = bountyInfo?.socialPlatform;

  const { data: content, isValidating: isRefreshing } = useSocialContent({
    url,
  });

  if (!url || !platform) {
    return null;
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white p-2">
        <div className="relative">
          {isRefreshing && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
              <Loader2
                className="size-6 animate-spin text-neutral-400"
                aria-hidden
              />
            </div>
          )}

          {platform.value === "youtube" && (
            <YouTubeContent
              url={url}
              content={content}
              authorOverride={authorOverride}
            />
          )}

          {platform.value === "twitter" && (
            <TwitterContent
              url={url}
              content={content}
              authorOverride={authorOverride}
            />
          )}

          {platform.value === "tiktok" && (
            <TikTokContent
              url={url}
              content={content}
              authorOverride={authorOverride}
            />
          )}

          {platform.value === "instagram" && (
            <InstagramContent
              url={url}
              content={content}
              authorOverride={authorOverride}
            />
          )}
        </div>
      </div>
    </>
  );
}

function ContentAuthor({
  url,
  platform,
  content,
  authorOverride,
}: ContentAuthorProps) {
  const { partner } = usePartnerProfile();
  const [avatarError, setAvatarError] = useState(false);

  const avatarUrl = authorOverride?.imageUrl
    ? authorOverride.imageUrl
    : platform
      ? partner?.platforms?.find((p) => p.type === platform)?.avatarUrl ?? null
      : null;

  const showAvatar = avatarUrl && !avatarError;
  const Icon = PLATFORM_ICONS[platform] ?? Tv;
  const statsLine = getStatsLine(content);

  const displayName = authorOverride?.name
    ? authorOverride.name
    : content?.handle
      ? platform === "twitter"
        ? `@${content.handle}`
        : content.handle
      : "—";

  return (
    <div className="flex items-center justify-between gap-3 p-2">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-100">
          {showAvatar ? (
            <img
              src={avatarUrl}
              alt=""
              className="size-10 object-cover"
              referrerPolicy="no-referrer"
              crossOrigin="anonymous"
              onError={() => setAvatarError(true)}
            />
          ) : (
            <Icon className="size-9 shrink-0 text-neutral-500" aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-neutral-800">
            {displayName}
          </p>

          {statsLine && <p className="text-xs text-neutral-500">{statsLine}</p>}
        </div>
      </div>

      <ButtonLink
        variant="secondary"
        href={url}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="h-7 shrink-0 px-2.5 py-1.5 text-xs"
      >
        View
      </ButtonLink>
    </div>
  );
}

function ContentEmbedWrapper({ children }: PropsWithChildren) {
  return <div className="rounded-lg bg-neutral-100 p-3">{children}</div>;
}

function ContentInfo({ content }: ContentInfoProps) {
  const title = content?.title ?? null;
  const description = content?.description ?? null;
  const publishedAt = content?.publishedAt ?? null;

  return (
    <div className="flex flex-col gap-1 overflow-y-auto p-2">
      {title && <p className="text-sm font-medium text-neutral-800">{title}</p>}

      {description && (
        <p className="text-sm font-normal text-neutral-500">
          {truncate(description, DESCRIPTION_MAX_LENGTH) ?? ""}
        </p>
      )}

      {publishedAt && (
        <p className="text-sm font-medium text-neutral-400">
          {formatDate(publishedAt, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      )}
    </div>
  );
}

function YouTubeContent({
  url,
  content,
  authorOverride,
}: SocialContentPreviewContentProps) {
  const embedUrl = getSocialContentEmbedUrl({
    platform: "youtube",
    url,
  });

  return (
    <div className="flex flex-col">
      <ContentAuthor
        url={url}
        platform="youtube"
        content={content}
        authorOverride={authorOverride}
      />

      <ContentEmbedWrapper>
        <div className="relative aspect-video w-full">
          {embedUrl && (
            <iframe
              src={embedUrl}
              title={content?.title ?? "YouTube video"}
              className="absolute inset-0 size-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
            />
          )}
        </div>
      </ContentEmbedWrapper>
      <ContentInfo content={content} />
    </div>
  );
}

function TwitterContent({
  url,
  content,
  authorOverride,
}: SocialContentPreviewContentProps) {
  const thumbnailUrl = content?.thumbnailUrl ?? null;
  const title = content?.title ?? null;
  const hasRichCard = !!(thumbnailUrl || title);

  return (
    <div className="flex flex-col">
      <ContentAuthor
        url={url}
        platform="twitter"
        content={content}
        authorOverride={authorOverride}
      />
      {hasRichCard && (thumbnailUrl || title) && (
        <ContentEmbedWrapper>
          <div className="overflow-hidden rounded-md border border-neutral-200 bg-neutral-50">
            {thumbnailUrl && (
              <img
                src={thumbnailUrl}
                alt={content?.title ?? "Twitter post"}
                className="aspect-video w-full object-cover"
              />
            )}
            {title && (
              <div className="p-2">
                <p className="line-clamp-2 text-sm font-medium text-neutral-900">
                  {title}
                </p>
              </div>
            )}
          </div>
        </ContentEmbedWrapper>
      )}
      <ContentInfo content={content} />
    </div>
  );
}

function TikTokContent({
  url,
  content,
  authorOverride,
}: SocialContentPreviewContentProps) {
  const embedUrl = getSocialContentEmbedUrl({
    platform: "tiktok",
    url,
  });

  return (
    <div className="flex flex-col">
      <ContentEmbedWrapper>
        <div className="relative mx-auto flex aspect-[9/16] max-h-[320px] w-full items-center justify-center overflow-hidden rounded-lg bg-black">
          {embedUrl && (
            <iframe
              src={embedUrl}
              title={content?.title ?? "TikTok video"}
              className="h-full max-h-full w-full max-w-full [aspect-ratio:9/16]"
              allowFullScreen
              loading="lazy"
            />
          )}
        </div>
      </ContentEmbedWrapper>
      <ContentAuthor
        url={url}
        platform="tiktok"
        content={content}
        position="bottom"
        authorOverride={authorOverride}
      />
      <ContentInfo content={content} />
    </div>
  );
}

function InstagramContent({
  url,
  content,
  authorOverride,
}: SocialContentPreviewContentProps) {
  const thumbnailUrl = content?.thumbnailUrl ?? null;
  const mediaType = content?.mediaType;
  const thumbnailUrls = content?.thumbnailUrls;

  const isCarousel =
    mediaType === "carousel" && thumbnailUrls && thumbnailUrls.length > 1;

  const embedUrl = getSocialContentEmbedUrl({
    platform: "instagram",
    url,
  });

  const imageUrls =
    isCarousel && thumbnailUrls
      ? thumbnailUrls
      : thumbnailUrl
        ? [thumbnailUrl]
        : [];

  return (
    <div className="flex flex-col">
      <ContentAuthor
        url={url}
        platform="instagram"
        content={content}
        authorOverride={authorOverride}
      />
      <ContentEmbedWrapper>
        <div className="relative mx-auto aspect-square max-h-[320px] w-full bg-neutral-100">
          {isCarousel ? (
            <Carousel opts={{ loop: true }} className="size-full">
              <CarouselContent className="ml-0 size-full">
                {imageUrls.map((src, idx) => (
                  <CarouselItem key={idx} className="basis-full pl-0">
                    <img
                      src={src}
                      alt={`${content?.title ?? "Instagram post"} slide ${idx + 1}`}
                      className="size-full object-cover"
                    />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselNavBar
                variant="simple"
                className="absolute bottom-2 left-1/2 -translate-x-1/2"
              />
            </Carousel>
          ) : embedUrl ? (
            <>
              <iframe
                src={embedUrl}
                title={content?.title ?? "Instagram post"}
                className="absolute inset-0 size-full"
                allowFullScreen
                loading="lazy"
              />
            </>
          ) : thumbnailUrl ? (
            <>
              <img
                src={thumbnailUrl}
                alt={content?.title ?? "Instagram post"}
                className="size-full object-cover"
              />
            </>
          ) : (
            <div className="flex size-full items-center justify-center text-sm text-neutral-500">
              Image preview
            </div>
          )}
        </div>
      </ContentEmbedWrapper>
      <ContentInfo content={content} />
    </div>
  );
}

function getStatsLine(content: SocialContent | null) {
  const views = content?.views ?? 0;
  const likes = content?.likes ?? 0;

  if (views === 0 && likes === 0) {
    return null;
  }

  return [
    views > 0 && `${views.toLocaleString()} views`,
    likes > 0 && `${likes.toLocaleString()} likes`,
  ]
    .filter(Boolean)
    .join(" • ");
}
