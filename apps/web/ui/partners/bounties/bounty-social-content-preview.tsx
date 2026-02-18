"use client";

import { SOCIAL_METRICS_CHANNELS } from "@/lib/bounty/constants";
import {
  getBountySocialPlatform,
  getSocialContentEmbedUrl,
} from "@/lib/bounty/utils";
import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import {
  BountySubmissionProps,
  PartnerBountyProps,
  SocialContent,
} from "@/lib/types";
import { useSocialContent } from "@/ui/partners/bounties/use-social-content";
import { ButtonLink } from "@/ui/placeholders/button-link";
import { formatDate, truncate } from "@dub/utils";
import type { LucideIcon } from "lucide-react";
import { Instagram, Loader2, Music2, Tv, Youtube } from "lucide-react";
import { PropsWithChildren } from "react";

const DESCRIPTION_MAX_LENGTH = 200;

type Platform = Pick<
  (typeof SOCIAL_METRICS_CHANNELS)[number],
  "value" | "label"
>;

const PLATFORM_ICONS: Record<Platform["value"], LucideIcon> = {
  youtube: Youtube,
  twitter: Tv,
  tiktok: Music2,
  instagram: Instagram,
};

interface BountySocialContentPreviewProps {
  bounty: Pick<PartnerBountyProps, "id" | "submissionRequirements">;
  submission: Pick<BountySubmissionProps, "urls"> | null | undefined;
}

interface SocialContentPreviewContentProps {
  url: string;
  content: SocialContent | null;
}

interface ContentAuthorProps {
  url: string;
  platform: Platform["value"];
  content: SocialContent | null;
  position?: "top" | "bottom";
}

interface ContentInfoProps {
  content: SocialContent | null;
}

export function BountySocialContentPreview({
  bounty,
  submission,
}: BountySocialContentPreviewProps) {
  const { programEnrollment } = useProgramEnrollment();

  const url = submission?.urls?.[0] ?? "";
  const platform = getBountySocialPlatform(bounty);

  const {
    data: content,
    isValidating: isRefreshing,
    mutate: refresh,
  } = useSocialContent({
    programId: programEnrollment?.programId,
    bountyId: bounty.id,
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
            <YouTubeContent url={url} content={content} />
          )}

          {platform.value === "twitter" && (
            <TwitterContent url={url} content={content} />
          )}

          {platform.value === "tiktok" && (
            <TikTokContent url={url} content={content} />
          )}

          {platform.value === "instagram" && (
            <InstagramContent url={url} content={content} />
          )}
        </div>
      </div>
    </>
  );
}

function ContentAuthor({ url, platform, content }: ContentAuthorProps) {
  const Icon = PLATFORM_ICONS[platform] ?? Tv;
  const handle = content?.handle;
  const statsLine = getStatsLine(content);

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-neutral-100">
          <Icon className="size-9 shrink-0 text-neutral-500" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-neutral-800">
            {handle ? (platform === "twitter" ? `@${handle}` : handle) : "—"}
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
  return <div className="my-2 rounded-lg bg-neutral-100 p-3">{children}</div>;
}

function ContentInfo({ content }: ContentInfoProps) {
  const title = content?.title ?? null;
  const description = content?.description ?? null;
  const publishedAt = content?.publishedAt ?? null;

  return (
    <div className="flex flex-col gap-1 overflow-y-auto p-3">
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

function YouTubeContent({ url, content }: SocialContentPreviewContentProps) {
  const embedUrl = getSocialContentEmbedUrl({
    platform: "youtube",
    url,
  });

  return (
    <div className="flex flex-col">
      <ContentAuthor url={url} platform="youtube" content={content} />

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

function TwitterContent({ url, content }: SocialContentPreviewContentProps) {
  const thumbnailUrl = content?.thumbnailUrl ?? null;
  const title = content?.title ?? null;
  const hasRichCard = !!(thumbnailUrl || title);

  return (
    <div className="flex flex-col">
      <ContentAuthor url={url} platform="twitter" content={content} />
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

function TikTokContent({ url, content }: SocialContentPreviewContentProps) {
  const thumbnailUrl = content?.thumbnailUrl ?? null;

  const embedUrl = getSocialContentEmbedUrl({
    platform: "tiktok",
    url,
  });

  return (
    <div className="flex flex-col">
      <ContentEmbedWrapper>
        <div className="relative mx-auto aspect-[9/16] max-h-[320px] w-full bg-neutral-100">
          {embedUrl ? (
            <iframe
              src={embedUrl}
              title={content?.title ?? "TikTok video"}
              className="absolute inset-0 size-full"
              allowFullScreen
              loading="lazy"
            />
          ) : thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={content?.title ?? "TikTok video"}
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-sm text-neutral-500">
              Video preview
            </div>
          )}
        </div>
      </ContentEmbedWrapper>
      <ContentInfo content={content} />
      <ContentAuthor
        url={url}
        platform="tiktok"
        content={content}
        position="bottom"
      />
    </div>
  );
}

function InstagramContent({ url, content }: SocialContentPreviewContentProps) {
  const thumbnailUrl = content?.thumbnailUrl ?? null;

  const embedUrl = getSocialContentEmbedUrl({
    platform: "instagram",
    url,
  });

  return (
    <div className="flex flex-col">
      <ContentAuthor url={url} platform="instagram" content={content} />
      <ContentEmbedWrapper>
        <div className="relative mx-auto aspect-square max-h-[320px] w-full bg-neutral-100">
          {embedUrl ? (
            <iframe
              src={embedUrl}
              title={content?.title ?? "Instagram post"}
              className="absolute inset-0 size-full"
              allowFullScreen
              loading="lazy"
            />
          ) : thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={content?.title ?? "Instagram post"}
              className="size-full object-cover"
            />
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
