import z from "../zod";
import { DOTS_API_URL } from "./env";
import { dotsHeaders } from "./utils";

const schema = z.object({
  name: z.string(),
  mask: z.string(),
});

export const addAppAchAccount = async ({
  dotsAppId,
  accountNumber,
  routingNumber,
  accountType,
}: {
  dotsAppId: string;
  accountNumber: string;
  routingNumber: string;
  accountType: "checking" | "savings";
}) => {
  const response = await fetch(
    `${DOTS_API_URL}/apps/${dotsAppId}/ach-account`,
    {
      method: "PUT",
      headers: dotsHeaders(),
      body: JSON.stringify({
        account_number: accountNumber,
        routing_number: routingNumber,
        account_type: accountType,
      }),
    },
  );

  if (!response.ok) {
    console.error(await response.text());
    throw new Error(`Failed to add ACH account to Dots app ${dotsAppId}.`);
  }

  return schema.parse(await response.json());
};
