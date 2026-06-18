import { scrapeCreatorsFetch } from "./client";

interface GetTikTokVideoTranscriptParams {
  url: string;
  language?: string;
  useAiAsFallback?: boolean;
}

export async function getTikTokVideoTranscript({
  url,
  language = "en",
  useAiAsFallback = false,
}: GetTikTokVideoTranscriptParams) {
  const { data, error } = await scrapeCreatorsFetch(
    "/v1/tiktok/video/transcript",
    {
      query: {
        url,
        language,
        use_ai_as_fallback: useAiAsFallback ? "true" : "false",
      },
    },
  );

  if (error) {
    throw new Error(
      "We were unable to retrieve the TikTok transcript from ScrapeCreators.",
    );
  }

  return data;
}
