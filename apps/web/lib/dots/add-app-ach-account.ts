import { DOTS_API_URL } from "./env";
import { achAccountSchema } from "./schemas";
import { getBasicAuthToken } from "./utils";

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
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${getBasicAuthToken()}`,
      },
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

  return achAccountSchema.parse(await response.json());
};
