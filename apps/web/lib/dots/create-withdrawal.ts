import { dotsFetch } from "./fetch";
import { DotsPayoutPlatform } from "./types";

export const createWithdrawal = async ({
  dotsUserId,
  amount,
  platform,
  payoutFeeParty,
  idempotencyKey,
}: {
  dotsUserId: string;
  amount: number;
  platform: DotsPayoutPlatform;
  payoutFeeParty?: "platform" | "user";
  idempotencyKey: string;
}) => {
  return await dotsFetch("/payouts", {
    method: "POST",
    dotsAppId: "default",
    body: {
      user_id: dotsUserId,
      amount,
      platform,
      payout_fee_party: payoutFeeParty,
      idempotency_key: idempotencyKey,
    },
  });
};
