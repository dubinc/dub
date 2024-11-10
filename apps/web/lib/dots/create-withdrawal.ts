import { DEFAULT_DOTS_APP_ID } from "@dub/utils";
import { DOTS_API_URL } from "./env";
import { DotsPayoutPlatform } from "./types";
import { dotsHeaders } from "./utils";

export const createWithdrawal = async ({
  dotsUserId,
  amount,
  platform,
}: {
  dotsUserId: string;
  amount: number;
  platform: DotsPayoutPlatform;
}) => {
  const response = await fetch(`${DOTS_API_URL}/payouts`, {
    method: "POST",
    headers: dotsHeaders({ dotsAppId: DEFAULT_DOTS_APP_ID }),
    body: JSON.stringify({
      user_id: dotsUserId,
      amount,
      platform,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create Dots payout: ${error.message}`);
  }

  return await response.json();
};
