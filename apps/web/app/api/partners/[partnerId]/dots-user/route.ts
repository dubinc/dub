import { DubApiError } from "@/lib/api/errors";
import { withPartner } from "@/lib/auth/partner";
import { DOTS_API_URL } from "@/lib/dots/env";
import { dotsHeaders } from "@/lib/dots/utils";
import { DEFAULT_DOTS_APP_ID } from "@dub/utils";
import { NextResponse } from "next/server";

// GET /api/partners/[partnerId]/dots-user – get Dots user info for a partner
export const GET = withPartner(async ({ partner }) => {
  const { dotsUserId } = partner;

  if (!dotsUserId) {
    throw new DubApiError({
      code: "bad_request",
      message: "Partner has no Dots user ID",
    });
  }

  const [info, payout_methods] = await Promise.all([
    fetch(`${DOTS_API_URL}/users/${dotsUserId}`, {
      method: "GET",
      headers: dotsHeaders({
        dotsAppId: DEFAULT_DOTS_APP_ID,
      }),
    }).then((res) => res.json()),
    fetch(`${DOTS_API_URL}/users/${dotsUserId}/payout-methods`, {
      method: "GET",
      headers: dotsHeaders({
        dotsAppId: DEFAULT_DOTS_APP_ID,
      }),
    }).then((res) => res.json()),
  ]);

  const data = {
    ...info,
    wallet: {
      ...info.wallet,
      pending_amount: info.wallet.amount - info.wallet.withdrawable_amount,
      withdrawable_amount: info.wallet.withdrawable_amount,
    },
    payout_methods: payout_methods.map((method) => ({
      ...method,
      default: info.default_payout_method === method.platform,
    })),
  };
  console.log(data);

  return NextResponse.json(data);
});
