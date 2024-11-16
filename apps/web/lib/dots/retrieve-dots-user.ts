import { PartnerProps } from "../types";
import { dotsFetch } from "./fetch";
import { dotsUserSchema } from "./schemas";

export const retrieveDotsUser = async (partner: PartnerProps) => {
  const [dotsUser, payoutMethods] = await Promise.all([
    dotsFetch(`/users/${partner.dotsUserId}`, {
      method: "GET",
      dotsAppId: "default",
    }),
    dotsFetch(`/users/${partner.dotsUserId}/payout-methods`, {
      method: "GET",
      dotsAppId: "default",
    }),
  ]);

  return dotsUserSchema.parse({
    ...dotsUser,
    compliance: {
      ...dotsUser.compliance,
      submitted:
        partner.country === "US"
          ? dotsUser.compliance.w9.tax_id_collected
          : dotsUser.compliance.w8_ben_collected,
    },
    wallet: {
      ...dotsUser.wallet,
      pending_amount:
        dotsUser.wallet.amount - dotsUser.wallet.withdrawable_amount,
    },
    payout_methods: payoutMethods.map((method) => ({
      ...method,
      default: dotsUser.default_payout_method === method.platform,
    })),
  });
};
