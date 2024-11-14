import { dotsFetch } from "./fetch";
import { DotsPayoutPlatform } from "./types";

export const createWithdrawal = async ({
  dotsUserId,
  amount,
  platform,
  payoutFeeParty,
}: {
  dotsUserId: string;
  amount: number;
  platform: DotsPayoutPlatform;
  payoutFeeParty?: "platform" | "user";
}) => {
  return await dotsFetch("/payouts", {
    method: "POST",
    dotsAppId: "default",
    body: {
      user_id: dotsUserId,
      amount,
      platform,
      payout_fee_party: payoutFeeParty,
    },
  });
};
