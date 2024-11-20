import { PartnerProps } from "../types";
import { dotsFetch } from "./fetch";
import { dotsUserSchema } from "./schemas";

export const retrieveDotsUser = async (partner: PartnerProps) => {
  const dotsUser = await dotsFetch(`/users/${partner.dotsUserId}`, {
    method: "GET",
    dotsAppId: "default",
  });

  return dotsUserSchema.parse({
    ...dotsUser,
    ...(dotsUser.compliance && {
      compliance: {
        ...dotsUser.compliance,
        submitted:
          partner.country === "US"
            ? dotsUser.compliance.w9.tax_id_collected
            : dotsUser.compliance.w8_ben_collected,
      },
    }),
    ...(dotsUser.wallet && {
      wallet: {
        ...dotsUser.wallet,
        pending_amount:
          dotsUser.wallet.amount - dotsUser.wallet.withdrawable_amount,
      },
    }),
  });
};
