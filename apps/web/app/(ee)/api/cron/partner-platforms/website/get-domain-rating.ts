import { fetchWithTimeout } from "@dub/utils";
import * as z from "zod/v4";

const domainRatingSchema = z.object({
  domain_rating: z.object({
    domain_rating: z.number(),
  }),
});

export async function getDomainRating(target: string) {
  const response = await fetchWithTimeout(
    `https://api.ahrefs.com/v3/public/domain-rating-free?target=${encodeURIComponent(target)}&output=json`,
    {
      headers: {
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch domain rating for ${target}: ${response.status} ${await response.text()}`,
    );
  }

  const data = await response.json();
  return Math.round(domainRatingSchema.parse(data).domain_rating.domain_rating);
}
