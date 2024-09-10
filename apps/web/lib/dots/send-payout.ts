import z from "../zod";
import { getDotsEnv } from "./env";
import { getEncodedCredentials } from "./utils";

const dotsPayoutSchema = z.object({
  id: z.string(),
});

export const sendPayout = async ({
  dotsUserId,
  amount,
}: {
  dotsUserId: string;
  amount: number;
}) => {
  const { DOTS_API_URL } = getDotsEnv();

  const response = await fetch(`${DOTS_API_URL}/payouts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${getEncodedCredentials()}`,
    },
    body: JSON.stringify({
      user_id: dotsUserId,
      amount,
      platform: "default",
      fund: true,
    }),
  });

  if (!response.ok) {
    console.error(await response.text());
    throw new Error("Failed to send payout.");
  }

  const data = await response.json();

  console.log("sendPayout", data);

  return dotsPayoutSchema.parse(data);
};
