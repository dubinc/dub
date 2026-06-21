import { scrapeCreatorsFetch } from "./client";
import { instagramUserPostsSchema } from "./schema";

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

  const parsed = instagramUserPostsSchema.safeParse(data);

  if (!parsed.success && isMissingInstagramUserPostsItems(data)) {
    console.warn("[ScrapeCreators] Instagram user posts unavailable", {
      handle,
      nextMaxId,
      issues: parsed.error.issues,
      response: summarizeScrapeCreatorsResponse(data),
    });

    return {
      items: [],
      next_max_id: null,
      more_available: false,
    };
  }

  if (!parsed.success) {
    throw new Error(
      `Unexpected Instagram user posts response from ScrapeCreators: ${JSON.stringify({
        issues: parsed.error.issues,
        response: summarizeScrapeCreatorsResponse(data),
      })}`,
    );
  }

  return parsed.data;
}

function isMissingInstagramUserPostsItems(data: unknown) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  return !("items" in data);
}

function summarizeScrapeCreatorsResponse(data: unknown) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return data;

  const response = data as Record<string, unknown>;

  return {
    keys: Object.keys(response).slice(0, 20),
    success: response.success,
    error: response.error,
    errorStatus: response.errorStatus,
    message: response.message,
    status: response.status,
    statusText: response.statusText,
  };
}
