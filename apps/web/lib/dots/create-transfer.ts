import { dotsFetch } from "./fetch";

export const createTransfer = async ({
  amount,
  dotsAppId,
  dotsUserId,
  idempotencyKey,
}: {
  amount: number;
  dotsAppId: string;
  dotsUserId: string;
  idempotencyKey: string;
}) => {
  console.log(
    `Creating a transfer of ${amount} cents, with idempotency key ${idempotencyKey}`,
  );

  return await dotsFetch("/transfers", {
    method: "POST",
    dotsAppId,
    body: {
      user_id: dotsUserId,
      amount: -amount, // negative means transfer from Business to Partner
      idempotency_key: idempotencyKey,
    },
  });
};
