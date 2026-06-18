import { scrapeCreatorsFetch } from "./client";

interface GetInstagramUserPostsParams {
  handle: string;
  nextMaxId?: string;
  trim?: boolean;
}

export async function getInstagramUserPosts({
  handle,
  nextMaxId,
  trim = true,
}: GetInstagramUserPostsParams) {
  const { data, error } = await scrapeCreatorsFetch(
    "/v2/instagram/user/posts",
    {
      query: {
        handle,
        next_max_id: nextMaxId,
        trim,
      },
    },
  );

  if (error) {
    throw new Error(
      "We were unable to retrieve Instagram user posts from ScrapeCreators.",
    );
  }

  return data;
}
