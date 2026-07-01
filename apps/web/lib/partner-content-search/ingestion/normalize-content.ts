import {
  instagramMediaTranscriptSchema,
  instagramUserPostsSchema,
  tiktokProfileVideosSchema,
  youtubeChannelVideosSchema,
} from "@/lib/api/scrape-creators/schema";
import { TranscriptSegment } from "@/lib/partner-content-search/types";
import * as z from "zod/v4";

type YouTubeChannelVideo = z.infer<
  typeof youtubeChannelVideosSchema
>["videos"][number];
type TikTokProfileVideo = z.infer<
  typeof tiktokProfileVideosSchema
>["aweme_list"][number];
type InstagramUserPost = z.infer<
  typeof instagramUserPostsSchema
>["items"][number];
type InstagramMediaTranscript = z.infer<typeof instagramMediaTranscriptSchema>;

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
  likeCount: number | null;
  commentCount: number | null;
  shareCount: number | null;
  saveCount: number | null;
  transcriptEligible?: boolean;
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
    likeCount: normalizeMetricCount(video.likeCountInt),
    commentCount: normalizeMetricCount(video.commentCountInt),
    shareCount: null,
    saveCount: null,
  };
}

export function normalizeYouTubeTranscriptSegments(
  transcript: Array<{ text: string; startMs: string; endMs: string }> | null,
): TranscriptSegment[] {
  return (transcript ?? [])
    .map((segment) => ({
      text: segment.text,
      startMs: parseMs(segment.startMs),
      endMs: parseMs(segment.endMs),
    }))
    .filter((segment) => segment.text.trim().length > 0);
}

export function normalizeTikTokProfileVideo(
  video: TikTokProfileVideo,
  handle: string,
): NormalizedPartnerContentItem | null {
  const platformContentId = video.aweme_id ?? video.id_str;
  if (!platformContentId) return null;

  const url =
    video.url ?? `https://www.tiktok.com/@${handle}/video/${platformContentId}`;
  const durationMs = normalizeTikTokDurationMs(
    video.video?.duration ?? video.duration,
  );

  return {
    platformContentId,
    url,
    contentType: "video",
    title: video.desc ?? null,
    description: video.desc ?? null,
    thumbnailUrl:
      firstUrl(video.video?.dynamic_cover?.url_list) ??
      firstUrl(video.video?.cover?.url_list),
    publishedAt:
      parseDate(video.create_time_utc) ??
      (typeof video.create_time === "number"
        ? new Date(video.create_time * 1000)
        : null),
    durationMs,
    viewCount:
      typeof video.statistics?.play_count === "number"
        ? Math.max(0, video.statistics.play_count)
        : null,
    likeCount: normalizeMetricCount(video.statistics?.digg_count),
    commentCount: normalizeMetricCount(video.statistics?.comment_count),
    shareCount: normalizeMetricCount(video.statistics?.share_count),
    saveCount: normalizeMetricCount(video.statistics?.collect_count),
    transcriptEligible: durationMs === null || durationMs <= 120_000,
  };
}

export function normalizeTikTokTranscriptSegments(
  transcript: string | null | undefined,
): TranscriptSegment[] {
  return parseWebVttTranscript(transcript ?? "");
}

export function normalizeInstagramUserPost(
  post: InstagramUserPost,
): NormalizedPartnerContentItem | null {
  const shortcode = post.code ?? extractInstagramShortcode(post.url);
  const platformContentId = shortcode ?? post.pk ?? post.id;
  if (!platformContentId) return null;

  const contentType = getInstagramContentType(post);
  const url = getInstagramContentUrl({
    contentType,
    fallbackUrl: post.url,
    shortcode,
  });
  if (!url) return null;

  const caption = post.caption?.text?.trim() || null;
  const durationMs =
    typeof post.video_duration === "number"
      ? Math.max(0, Math.round(post.video_duration * 1000))
      : null;

  return {
    platformContentId,
    url,
    contentType,
    title: normalizeCaptionTitle(caption),
    description: caption,
    thumbnailUrl:
      post.display_uri ?? firstUrl(post.image_versions2?.candidates),
    publishedAt:
      typeof post.taken_at === "number" ? new Date(post.taken_at * 1000) : null,
    durationMs,
    viewCount:
      typeof post.play_count === "number"
        ? Math.max(0, post.play_count)
        : typeof post.ig_play_count === "number"
          ? Math.max(0, post.ig_play_count)
          : null,
    likeCount: normalizeMetricCount(post.like_count),
    commentCount: normalizeMetricCount(post.comment_count),
    shareCount: null,
    saveCount: null,
    transcriptEligible:
      isInstagramVideoContent(post) &&
      (durationMs === null || durationMs <= 120_000),
  };
}

export function normalizeInstagramTranscriptSegments(
  transcriptResponse: InstagramMediaTranscript,
): TranscriptSegment[] {
  return (transcriptResponse.transcripts ?? [])
    .map(({ text }) => ({
      text: text ?? "",
      startMs: null,
      endMs: null,
    }))
    .filter((segment) => segment.text.trim().length > 0);
}

function parseDate(value?: string | null) {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseMs(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeTikTokDurationMs(value?: number | null) {
  if (typeof value !== "number") return null;
  const duration = Math.max(0, value);

  return duration > 0 && duration < 1000 ? duration * 1000 : duration;
}

function normalizeMetricCount(value?: number | null) {
  return typeof value === "number" ? Math.max(0, value) : null;
}

function firstUrl(values?: Array<{ url?: string | null } | string> | null) {
  const first = values?.[0];
  if (!first) return null;

  return typeof first === "string" ? first : first.url ?? null;
}

function getInstagramContentType(post: InstagramUserPost) {
  if (post.product_type === "clips" || post.url?.includes("/reel/")) {
    return "reel";
  }

  switch (post.media_type) {
    case 1:
      return "image";
    case 2:
      return "video";
    case 8:
      return "carousel";
    default:
      return "post";
  }
}

function isInstagramVideoContent(post: InstagramUserPost) {
  return (
    post.product_type === "clips" ||
    post.media_type === 2 ||
    Boolean(post.video_versions?.length)
  );
}

function extractInstagramShortcode(url?: string | null) {
  if (!url) return null;

  try {
    const pathname = new URL(url).pathname;
    const shortcode = pathname.match(
      /^\/(?:(?:[^/]+)\/)?(?:p|reel|tv)\/([^/?#]+)/,
    )?.[1];
    return shortcode || null;
  } catch {
    const shortcode = url.match(
      /instagram\.com\/(?:(?:[^/]+)\/)?(?:p|reel|tv)\/([^/?#]+)/,
    )?.[1];
    return shortcode || null;
  }
}

function getInstagramContentUrl({
  contentType,
  fallbackUrl,
  shortcode,
}: {
  contentType: string;
  fallbackUrl?: string | null;
  shortcode?: string | null;
}) {
  if (shortcode) {
    return `https://www.instagram.com/${contentType === "reel" ? "reel" : "p"}/${shortcode}/`;
  }

  return fallbackUrl ?? null;
}

function normalizeCaptionTitle(caption: string | null) {
  if (!caption) return null;

  const firstLine = caption.split(/\r?\n/)[0]?.trim();
  if (!firstLine) return null;

  return firstLine.length > 140
    ? `${firstLine.slice(0, 137).trimEnd()}...`
    : firstLine;
}

function parseWebVttTranscript(transcript: string): TranscriptSegment[] {
  const lines = transcript.replace(/\r\n/g, "\n").split("\n");
  const segments: TranscriptSegment[] = [];

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index].trim();
    if (!line.includes("-->")) continue;

    const [start, rest] = line.split("-->");
    const end = rest?.trim().split(/\s+/)[0];
    const startMs = parseWebVttTimestamp(start.trim());
    const endMs = end ? parseWebVttTimestamp(end) : null;
    const textLines: string[] = [];

    index++;
    while (index < lines.length && lines[index].trim().length > 0) {
      textLines.push(lines[index].trim());
      index++;
    }

    const text = textLines.join(" ").trim();
    if (text) {
      segments.push({
        text,
        startMs,
        endMs,
      });
    }
  }

  return segments;
}

function parseWebVttTimestamp(value: string) {
  const parts = value.split(":");
  if (parts.length < 2 || parts.length > 3) return null;

  const secondsPart = parts.pop();
  const minutesPart = parts.pop();
  const hoursPart = parts.pop();

  const seconds = Number.parseFloat(secondsPart ?? "");
  const minutes = Number.parseInt(minutesPart ?? "", 10);
  const hours = hoursPart ? Number.parseInt(hoursPart, 10) : 0;

  if (![seconds, minutes, hours].every(Number.isFinite)) return null;

  return Math.round(((hours * 60 + minutes) * 60 + seconds) * 1000);
}
