import { SocialContent } from "@/lib/types";
import { PlatformType } from "@dub/prisma/client";
import {
  BasePlatformAdapter,
  type FetchPostsParams,
  type PostEngagement,
  type SocialProfile,
} from "./base-adapter";
import { checkYouTubeApiQuota } from "./rate-limiter";
import {
  AccountNotFoundError,
  ContentNotFoundError,
  isAccountNotFound,
  scrapeCreatorsFetch,
} from "./scrape-creators";
import {
  YouTubeApiError,
  YouTubeApiQuotaExceededError,
  ytFetch,
} from "./youtube-client";
import {
  type YouTubeVideo,
  youtubeContentSchema,
  youtubeProfileSchema,
} from "./youtube-schemas";

export class YouTubeAdapter extends BasePlatformAdapter {
  platform: PlatformType = "youtube";

  async fetchProfile(handle: string): Promise<SocialProfile> {
    const { data: raw, error } = await scrapeCreatorsFetch(
      "/v1/:platform/:handleType",
      {
        params: {
          platform: "youtube",
          handleType: "channel",
        },
        query: {
          handle,
        },
      },
    );

    if (error) {
      throw new Error(
        "We were unable to retrieve your social media profile. Please try again.",
      );
    }

    if (isAccountNotFound(raw)) {
      throw new AccountNotFoundError(
        (raw as any).message || "Account doesn't exist",
      );
    }

    const data = youtubeProfileSchema.parse(raw);

    const largestAvatar = data.avatar.image.sources.sort(
      (a, b) => b.width - a.width,
    )[0];

    return {
      description: data.description,
      platformId: data.channelId,
      subscribers: BigInt(data.subscriberCount),
      posts: BigInt(data.videoCount),
      views: BigInt(data.viewCount),
      avatarUrl: largestAvatar?.url ?? null,
    };
  }

  async fetchPost(url: string): Promise<SocialContent> {
    const { data: raw, error } = await scrapeCreatorsFetch(
      "/:version/:platform/:contentType",
      {
        params: {
          version: "v1",
          platform: "youtube",
          contentType: "video",
        },
        query: {
          url,
        },
      },
    );

    if (error) {
      throw new ContentNotFoundError(
        error.status ?? 500,
        error.statusText ?? "Unknown error",
      );
    }

    const data = youtubeContentSchema.parse(raw);

    return {
      publishedAt: new Date(data.publishDateText),
      handle: data.channel.handle,
      platformId: data.channel.id,
      views: data.viewCountInt,
      likes: data.likeCountInt,
      title: data.title ?? null,
      description: data.description ?? null,
      thumbnailUrl: data.thumbnailUrl ?? null,
    };
  }

  async fetchPosts({
    platformId,
    startTime,
    endTime,
  }: FetchPostsParams): Promise<PostEngagement[]> {
    const videoIds = await this._getChannelVideos(
      platformId,
      startTime,
      endTime,
    );

    if (videoIds.length === 0) {
      return [];
    }

    const videos = await this._getVideoStatistics(videoIds);

    return videos.map((video) => {
      const views = video.statistics.viewCount;
      const likes = video.statistics.likeCount;
      const comments = video.statistics.commentCount;

      const engagementRate = views > 0 ? (likes + comments) / views : 0;

      return {
        postId: video.id,
        publishedAt: new Date(video.snippet.publishedAt),
        title: video.snippet.title,
        views,
        likes,
        comments,
        engagementRate,
      };
    });
  }

  private async _getChannelVideos(
    channelId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<string[]> {
    // Derive the auto-generated uploads playlist ID from the channel ID
    // Every YouTube channel has one: UC... → UU...
    const uploadsPlaylistId = "UU" + channelId.slice(2);

    const allVideoIds: string[] = [];
    let pageToken: string | undefined;

    // Uploads playlist is in reverse chronological order.
    // Paginate until we pass startTime, then stop.
    for (let page = 0; page < 10; page++) {
      const { success } = await checkYouTubeApiQuota(1);

      if (!success) {
        throw new YouTubeApiQuotaExceededError();
      }

      const { data, error } = await ytFetch("/playlistItems", {
        query: {
          part: "contentDetails",
          playlistId: uploadsPlaylistId,
          maxResults: "50",
          ...(pageToken && { pageToken }),
        },
      });

      if (error) {
        throw new YouTubeApiError(error);
      }

      let reachedOlderThanStart = false;

      for (const item of data.items) {
        const publishedAt = new Date(item.contentDetails.videoPublishedAt);

        if (publishedAt < startTime) {
          reachedOlderThanStart = true;
          break;
        }

        if (publishedAt < endTime) {
          allVideoIds.push(item.contentDetails.videoId);
        }
      }

      if (reachedOlderThanStart || !data.nextPageToken) {
        break;
      }

      pageToken = data.nextPageToken;
    }

    return allVideoIds;
  }

  private async _getVideoStatistics(
    videoIds: string[],
  ): Promise<YouTubeVideo[]> {
    const allVideos: YouTubeVideo[] = [];

    // Batch in chunks of 50 (YouTube API max per request)
    for (let i = 0; i < videoIds.length; i += 50) {
      const batch = videoIds.slice(i, i + 50);

      const { success } = await checkYouTubeApiQuota(1);

      if (!success) {
        throw new YouTubeApiQuotaExceededError();
      }

      const { data, error } = await ytFetch("/videos", {
        query: {
          part: "snippet,statistics",
          id: batch.join(","),
        },
      });

      if (error) {
        throw new YouTubeApiError(error);
      }

      allVideos.push(...data.items);
    }

    return allVideos;
  }
}
