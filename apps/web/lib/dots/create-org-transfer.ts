import { dotsFetch } from "./fetch";

export const createOrgTransfer = async ({
  amount,
  dotsAppId,
  idempotencyKey,
}: {
  amount: number;
  dotsAppId: string;
  idempotencyKey: string;
}) => {
  console.log(`Creating an org transfer of ${amount} cents`);

  return await dotsFetch("/organization-transfers", {
    method: "POST",
    body: {
      amount,
      api_app_id: dotsAppId,
      idempotency_key: idempotencyKey,
    },
  });
};
