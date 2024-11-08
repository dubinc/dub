import z from "../zod";
import { DOTS_API_URL } from "./env";
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

export const sendPayout = async ({
  dotsUserId,
  amount,
  dotsAppId,
}: {
  dotsUserId: string;
  amount: number;
  dotsAppId: string;
}) => {
  const response = await fetch(`${DOTS_API_URL}/payouts/send-payout`, {
    method: "POST",
    headers: dotsHeaders({ dotsAppId }),
    body: JSON.stringify({
      user_id: dotsUserId,
      amount,
    }),
  });

  if (!response.ok) {
    console.error(await response.text());

    throw new Error(`Failed to create Dots user.`);
  }

  // TODO: [dots] update payout status in our DB? might also need to use webhooks for this

  return responseSchema.parse(await response.json());
};
