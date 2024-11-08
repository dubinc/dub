import { DOTS_API_URL } from "./env";
import { dotsHeaders } from "./utils";

export const createTransfer = async ({
  amount,
  dotsAppId,
  dotsUserId,
}: {
  amount: number;
  dotsAppId: string;
  dotsUserId: string;
}) => {
  console.log(`Creating a transfer of ${amount} cents`);
  const response = await fetch(`${DOTS_API_URL}/transfers`, {
    method: "POST",
    headers: dotsHeaders({ dotsAppId }),
    body: JSON.stringify({
      user_id: dotsUserId,
      amount: -amount, // negative means transfer from Business to Partner
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create Dots transfer: ${error.message}`);
  }

  return await response.json();
};
