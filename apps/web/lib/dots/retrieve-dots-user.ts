import { DEFAULT_DOTS_APP_ID } from "@dub/utils";
import { PartnerProps } from "../types";
import { DOTS_API_URL } from "./env";
import { dotsHeaders } from "./utils";

export const retrieveDotsUser = async ({
  dotsUserId,
  partner,
}: {
  dotsUserId: string;
  partner: PartnerProps;
}) => {
  const response = await fetch(`${DOTS_API_URL}/users/${dotsUserId}`, {
    method: "GET",
    headers: dotsHeaders({ dotsAppId: DEFAULT_DOTS_APP_ID }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `Failed to retrieve Dots user ${dotsUserId}: ${error.message}`,
    );
  }

  const data = await response.json();

  return {
    ...data,
    compliance: {
      ...data.compliance,
      submitted:
        partner.country === "US"
          ? data.compliance.w9.tax_id_collected
          : data.compliance.w8_ben_collected,
    },
    wallet: {
      ...data.wallet,
      pending_amount: data.wallet.amount - data.wallet.withdrawable_amount,
    },
  };
};
