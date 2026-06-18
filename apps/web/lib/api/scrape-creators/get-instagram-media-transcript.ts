import { scrapeCreatorsFetch } from "./client";

interface GetInstagramMediaTranscriptParams {
  url: string;
}

export async function getInstagramMediaTranscript({
  url,
}: GetInstagramMediaTranscriptParams) {
  const { data, error } = await scrapeCreatorsFetch(
    "/v2/instagram/media/transcript",
    {
      query: {
        url,
      },
    },
  );

  if (error) {
    throw new Error(
      "We were unable to retrieve the Instagram transcript from ScrapeCreators.",
    );
  }

  return data;
}
