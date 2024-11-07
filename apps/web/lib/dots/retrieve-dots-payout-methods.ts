import { DOTS_API_URL } from "./env";
import { dotsAppSchema } from "./schemas";
import { dotsHeaders } from "./utils";

export const retrieveDotsPayoutMethods = async ({
  dotsUserId,
  dotsAppId,
}: {
  dotsUserId: string;
  dotsAppId: string;
}) => {
  const response = await fetch(
    `${DOTS_API_URL}/users/${dotsUserId}/payout-methods`,
    {
      method: "GET",
      headers: dotsHeaders({ dotsAppId }),
    },
  );

  if (!response.ok) {
    console.error(await response.text());
    throw new Error(
      `Failed to retrieve payout methods for Dots user ${dotsUserId}.`,
    );
  }

  return dotsAppSchema.parse(await response.json());
};
