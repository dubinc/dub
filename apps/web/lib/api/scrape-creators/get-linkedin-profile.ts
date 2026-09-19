import { scrapeCreatorsFetch } from "./client";

export class LinkedInProfileUnavailableError extends Error {
  constructor() {
    super(
      "This LinkedIn profile is private or not publicly available. Make the profile visible to anyone and try again.",
    );
    this.name = "LinkedInProfileUnavailableError";
  }
}

export interface LinkedInProfileResult {
  name: string | null;
  image: string | null;
  followers: number;
}

export async function getLinkedInProfile(
  url: string,
): Promise<LinkedInProfileResult> {
  const profileUrl = url.endsWith("/") ? url : `${url}/`;

  const { data, error } = await scrapeCreatorsFetch("/v1/linkedin/profile", {
    query: {
      url: profileUrl,
    },
  });

  if (error) {
    const message =
      typeof error === "object" && error && "message" in error
        ? String(error.message)
        : "";

    if (
      message.toLowerCase().includes("private") ||
      message.toLowerCase().includes("not publicly available") ||
      message.toLowerCase().includes("not_found")
    ) {
      throw new LinkedInProfileUnavailableError();
    }

    throw new Error(
      "We were unable to retrieve the LinkedIn profile. Please check the URL and try again.",
    );
  }

  return {
    name: data.name ?? null,
    image: data.image ?? null,
    followers: data.followers ?? 0,
  };
}
