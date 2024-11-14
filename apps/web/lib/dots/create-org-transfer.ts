import { dotsFetch } from "./fetch";
import { createIdempotencyKey } from "./utils";

export const createOrgTransfer = async ({
  amount,
  dotsAppId,
}: {
  amount: number;
  dotsAppId: string;
}) => {
  console.log(`Creating an org transfer of ${amount} cents`);

  return await dotsFetch("/organization-transfers", {
    method: "POST",
    body: {
      amount,
      api_app_id: dotsAppId,
      idempotency_key: await createIdempotencyKey(),
    },
  });
};
