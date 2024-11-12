import { DEFAULT_DOTS_APP_ID } from "@dub/utils";
import { DOTS_API_URL } from "./env";
import { dotsTransfersSchema } from "./schemas";
import { dotsHeaders } from "./utils";

export const retrieveTransfers = async ({
  dotsAppId,
  dotsUserId,
  type,
}: {
  dotsAppId?: string;
  dotsUserId?: string;
  type?: "refill" | "balance" | "payout";
}) => {
  const params = new URLSearchParams({
    ...(type ? { type } : {}),
    ...(dotsUserId ? { user_id: dotsUserId } : {}),
  });

  const response = await fetch(
    `${DOTS_API_URL}/transfers${
      params.size > 0 ? `?${params.toString()}` : ""
    }`,
    {
      method: "GET",
      headers: dotsHeaders({ dotsAppId: dotsAppId ?? DEFAULT_DOTS_APP_ID }),
    },
  );

  if (!response.ok) {
    console.error(await response.text());

    throw new Error(`Failed to retrieve transfers for Dots app ${dotsAppId}.`);
  }

  return dotsTransfersSchema.parse(await response.json());
};
