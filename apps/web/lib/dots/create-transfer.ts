import { dotsFetch } from "./fetch";
import { createIdempotencyKey } from "./utils";

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

  return await dotsFetch("/transfers", {
    method: "POST",
    dotsAppId,
    body: {
      user_id: dotsUserId,
      amount: -amount, // negative means transfer from Business to Partner
      idempotency_key: await createIdempotencyKey(),
    },
  });
};
