import { scrapeCreatorsFetch } from "./client";

interface LinkedInPostResult {
  description: string | null;
  author: {
    url: string | null;
    followers: number;
  };
}

export async function getLinkedInPost(
  url: string,
): Promise<LinkedInPostResult> {
  const { data, error } = await scrapeCreatorsFetch(
    "/:version/:platform/:contentType",
    {
      params: {
        version: "v1",
        platform: "linkedin",
        contentType: "post",
      },
      query: {
        url,
      },
    },
  );

  if (error) {
    throw new Error(
      "We were unable to retrieve the LinkedIn post. Please check the URL and try again.",
    );
  }

  if (data.platform !== "linkedin") {
    throw new Error(
      "The provided URL does not appear to be a valid LinkedIn post.",
    );
  }

  return {
    description: data.description ?? data.headline ?? null,
    author: {
      url: data.author.url ?? null,
      followers: data.author.followers ?? 0,
    },
  };
}
