import z from "../zod";
import { DOTS_API_URL } from "./env";
import { dotsHeaders } from "./utils";

const schema = z.object({
  id: z.string(),
  status: z.string(),
  metrics: z.object({
    connected_users: z.number(),
    money_out: z.string(),
    wallet_balance: z.string(),
  }),
});

export const retrieveDotsApp = async ({ dotsAppId }: { dotsAppId: string }) => {
  const response = await fetch(`${DOTS_API_URL}/apps/${dotsAppId}`, {
    method: "GET",
    headers: dotsHeaders(),
  });

  if (!response.ok) {
    console.error(await response.text());
    throw new Error(`Failed to retrieve Dots app ${dotsAppId}.`);
  }

  return schema.parse(await response.json());
};
