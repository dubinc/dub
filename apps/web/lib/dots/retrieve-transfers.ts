import { DOTS_API_URL } from "./env";
import { dotsTransfersSchema } from "./schemas";
import { dotsHeaders } from "./utils";

export const retrieveTransfers = async ({
  dotsAppId,
}: {
  dotsAppId: string;
}) => {
  const response = await fetch(`${DOTS_API_URL}/transfers`, {
    method: "GET",
    headers: dotsHeaders({ dotsAppId }),
  });

  if (!response.ok) {
    console.error(await response.text());

    throw new Error(`Failed to retrieve transfers for Dots app ${dotsAppId}.`);
  }

  return dotsTransfersSchema.parse(await response.json());
};
