import { DOTS_API_URL } from "./env";
import { dotsAppSchema } from "./schemas";
import { dotsHeaders } from "./utils";

export const retrieveDotsApp = async ({ dotsAppId }: { dotsAppId: string }) => {
  const response = await fetch(`${DOTS_API_URL}/apps/${dotsAppId}`, {
    method: "GET",
    headers: dotsHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `Failed to retrieve Dots app ${dotsAppId}: ${error.message}`,
    );
  }

  return dotsAppSchema.parse(await response.json());
};
