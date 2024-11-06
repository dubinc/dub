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
    const error = await response.json();
    console.error(error);
    throw new Error(`Failed to connect bank account: ${error.message}`);
  }

  return schema.parse(await response.json());
};
