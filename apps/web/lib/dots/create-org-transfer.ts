import { DOTS_API_URL } from "./env";
import { dotsHeaders } from "./utils";

export const createOrgTransfer = async ({
  amount,
  dotsAppId,
}: {
  amount: number;
  dotsAppId: string;
}) => {
  console.log(`Creating an org transfer of ${amount} cents`);
  const response = await fetch(`${DOTS_API_URL}/organization-transfers`, {
    method: "POST",
    headers: dotsHeaders(),
    body: JSON.stringify({
      amount,
      api_app_id: dotsAppId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create Dots org transfer: ${error.message}`);
  }

  return await response.json();
};
