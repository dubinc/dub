import { youtubeChannelVideosSchema } from "@/lib/api/scrape-creators/schema";
import * as z from "zod/v4";

type YouTubeChannelVideo = z.infer<
  typeof youtubeChannelVideosSchema
>["videos"][number];

export type NormalizedPartnerContentItem = {
  platformContentId: string;
  url: string;
  contentType: string;
  title: string | null;
  description: string | null;
  thumbnailUrl: string | null;
  publishedAt: Date | null;
  durationMs: number | null;
  viewCount: number | null;
};

export function normalizeYouTubeChannelVideo(
  video: YouTubeChannelVideo,
): NormalizedPartnerContentItem | null {
  if (!video.id || !video.url) return null;

  return {
    platformContentId: video.id,
    url: video.url,
    contentType: video.type || "video",
    title: video.title ?? null,
    description: video.description ?? null,
    thumbnailUrl: video.thumbnail ?? null,
    publishedAt: parseDate(video.publishedTime),
    durationMs:
      typeof video.lengthSeconds === "number"
        ? Math.max(0, video.lengthSeconds * 1000)
        : null,
    viewCount:
      typeof video.viewCountInt === "number"
        ? Math.max(0, video.viewCountInt)
        : null,
  };
}

function parseDate(value?: string | null) {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
