import { DEFAULT_DOTS_APP_ID } from "@dub/utils";
import { PartnerProps } from "../types";
import { DOTS_API_URL } from "./env";
import { dotsUserSchema } from "./schemas";
import { dotsHeaders } from "./utils";

export const retrieveDotsUser = async ({
  dotsUserId,
  partner,
}: {
  dotsUserId: string;
  partner: PartnerProps;
}) => {
  const [dotsUser, payoutMethods] = await Promise.all([
    fetch(`${DOTS_API_URL}/users/${dotsUserId}`, {
      method: "GET",
      headers: dotsHeaders({ dotsAppId: DEFAULT_DOTS_APP_ID }),
    }).then((res) => res.json()),
    fetch(`${DOTS_API_URL}/users/${dotsUserId}/payout-methods`, {
      method: "GET",
      headers: dotsHeaders({ dotsAppId: DEFAULT_DOTS_APP_ID }),
    }).then((res) => res.json()),
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
