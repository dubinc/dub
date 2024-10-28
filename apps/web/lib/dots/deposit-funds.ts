import z from "../zod";
import { DOTS_API_URL } from "./env";
import { dotsHeaders } from "./utils";

const statusSchema = z.enum([
  "created",
  "pending",
  "failed",
  "completed",
  "reversed",
  "canceled",
  "flagged",
]);

const schema = z.object({
  id: z.string(),
  amount: z.number(),
  status: statusSchema,
  status_history: z.array(
    z.object({
      status: statusSchema,
      timestamp: z.string(),
    }),
  ),
});

export const depositFunds = async ({
  dotsAppId,
  amount,
}: {
  dotsAppId: string;
  amount: string;
}) => {
  const response = await fetch(`${DOTS_API_URL}/apps/${dotsAppId}/deposit`, {
    method: "POST",
    headers: dotsHeaders(),
    body: JSON.stringify({
      amount: Number(amount) * 100, // The amount to deposit in cents
      idempotency_key: crypto.randomUUID(),
    }),
  });

  if (!response.ok) {
    console.error(await response.text());
    throw new Error(`Failed to deposit funds into Dots app ${dotsAppId}.`);
  }

  return schema.parse(await response.json());
};
