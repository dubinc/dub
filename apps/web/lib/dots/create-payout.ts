import z from "../zod";
import { DOTS_API_URL } from "./env";
import { DotsPayoutPlatform } from "./types";
import { dotsHeaders } from "./utils";

const responseSchema = z.object({
  id: z.string(),
  status: z.enum([
    "created",
    "delivery_pending",
    "delivery_failed",
    "sent",
    "delivered",
    "claimed",
    "reversed",
    "canceled",
    "expired",
  ]),
});

export const createPayout = async ({
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
    headers: dotsHeaders(),
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

  return responseSchema.parse(await response.json());
};
