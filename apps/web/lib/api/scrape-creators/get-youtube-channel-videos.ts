import { scrapeCreatorsFetch } from "./client";

type GetYouTubeChannelVideosParams = (
  | {
      channelId: string;
      handle?: string;
    }
  | {
      channelId?: string;
      handle: string;
    }
) & {
  continuationToken?: string;
  includeExtras?: boolean;
};

export async function getYouTubeChannelVideos({
  channelId,
  handle,
  continuationToken,
  includeExtras = false,
}: GetYouTubeChannelVideosParams) {
  const { data, error } = await scrapeCreatorsFetch(
    "/v1/youtube/channel-videos",
    {
      query: {
        channelId,
        handle,
        sort: "latest",
        continuationToken,
        includeExtras: includeExtras ? "true" : "false",
      },
    },
  );

  if (error) {
    throw new Error(
      "We were unable to retrieve YouTube channel videos from ScrapeCreators.",
    );
  }

  return data;
}
