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
    if (isTikTokTranscriptUnavailableError(error)) {
      return {
        id: null,
        url,
        transcript: null,
      };
    }

    throw new Error(
      "We were unable to retrieve the TikTok transcript from ScrapeCreators.",
    );
  }

  return data;
}

function isTikTokTranscriptUnavailableError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const status =
    "status" in error && typeof error.status === "number"
      ? error.status
      : "errorStatus" in error && typeof error.errorStatus === "number"
        ? error.errorStatus
        : null;

  if (status !== 400) return false;

  const message =
    "message" in error && typeof error.message === "string"
      ? error.message.toLowerCase()
      : "";

  return (
    message.includes("not a video") ||
    message.includes("photo carousel") ||
    message.includes("no transcript")
  );
}
