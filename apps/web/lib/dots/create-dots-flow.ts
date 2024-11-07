import z from "../zod";
import { DOTS_API_URL } from "./env";
import { dotsHeaders } from "./utils";

const responseSchema = z.object({
  id: z.string(),
  link: z.string(),
});

export const createDotsFlow = async ({
  dotsUserId,
  steps = ["authorization"],
}: {
  dotsUserId: string;
  steps?: (
    | "authorization"
    | "compliance"
    | "id-verification"
    | "background-check"
    | "manage-payouts"
    | "manage-payments"
    | "payout"
    | "redirect"
  )[];
}) => {
  const response = await fetch(`${DOTS_API_URL}/flows`, {
    method: "POST",
    headers: dotsHeaders({ dotsAppId: "0f01ec2b-e29e-4627-ae28-5ecc24d25935	" }),
    body: JSON.stringify({
      steps,
      user_id: dotsUserId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create Dots flow: ${error.message}`);
  }

  return responseSchema.parse(await response.json());
};
