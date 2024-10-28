import { DOTS_API_URL } from "./env";
import { dotsAppSchema } from "./schemas";
import { dotsHeaders } from "./utils";

export const retrieveDotsApp = async ({ dotsAppId }: { dotsAppId: string }) => {
  const response = await fetch(`${DOTS_API_URL}/apps/${dotsAppId}`, {
    method: "GET",
    headers: dotsHeaders(),
  });

  if (!response.ok) {
    console.error(await response.text());
    throw new Error(`Failed to retrieve Dots app ${dotsAppId}.`);
  }

  return dotsAppSchema.parse(await response.json());
};
