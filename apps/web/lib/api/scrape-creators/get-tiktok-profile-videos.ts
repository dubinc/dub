import { scrapeCreatorsFetch } from "./client";

interface GetTikTokProfileVideosParams {
  handle: string;
  userId?: string;
  maxCursor?: string;
  trim?: boolean;
}

export async function getTikTokProfileVideos({
  handle,
  userId,
  maxCursor,
  trim = true,
}: GetTikTokProfileVideosParams) {
  const { data, error } = await scrapeCreatorsFetch(
    "/v3/tiktok/profile/videos",
    {
      query: {
        handle,
        user_id: userId,
        sort_by: "latest",
        max_cursor: maxCursor,
        trim,
      },
    },
  );

  if (error) {
    throw new Error(
      "We were unable to retrieve TikTok profile videos from ScrapeCreators.",
    );
  }

  return data;
}
