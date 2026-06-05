import { scrapeCreatorsFetch } from "./client";

interface GetYouTubeVideoTranscriptParams {
  url: string;
  language?: string;
}

export async function getYouTubeVideoTranscript({
  url,
  language = "en",
}: GetYouTubeVideoTranscriptParams) {
  const { data, error } = await scrapeCreatorsFetch(
    "/v1/youtube/video/transcript",
    {
      query: {
        url,
        language,
      },
    },
  );

  if (error) {
    throw new Error(
      "We were unable to retrieve the YouTube transcript from ScrapeCreators.",
    );
  }

  return data;
}
