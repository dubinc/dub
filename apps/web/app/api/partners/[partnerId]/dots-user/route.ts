import { withPartner } from "@/lib/auth/partner";
import { DOTS_API_URL } from "@/lib/dots/env";
import { retrieveDotsFlow } from "@/lib/dots/retrieve-dots-flow";
import { dotsHeaders } from "@/lib/dots/utils";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/upstash";
import { DEFAULT_DOTS_APP_ID } from "@dub/utils";
import { NextResponse } from "next/server";

// GET /api/partners/[partnerId]/dots-user – get Dots user info for a partner
export const GET = withPartner(async ({ partner }) => {
  let dotsUserId = partner.dotsUserId;

  if (!dotsUserId) {
    const cachedFlowId = await redis.get<string>(
      `dots-flow-cache:${partner.id}`,
    );
    if (cachedFlowId) {
      const flow = await retrieveDotsFlow({ flowId: cachedFlowId });
      if (flow.user_id) {
        dotsUserId = flow.user_id;
        await Promise.allSettled([
          prisma.partner.update({
            where: { id: partner.id },
            data: { dotsUserId },
          }),
          redis.del(`dots-flow-cache:${partner.id}`),
        ]);
      }
    }
  }

  // if there  is still no dots ID
  if (!dotsUserId) {
    return NextResponse.json({});
  }

  const [info, payout_methods] = await Promise.all([
    fetch(`${DOTS_API_URL}/users/${dotsUserId}`, {
      method: "GET",
      headers: dotsHeaders({ dotsAppId: DEFAULT_DOTS_APP_ID }),
    }).then((res) => res.json()),
    fetch(`${DOTS_API_URL}/users/${dotsUserId}/payout-methods`, {
      method: "GET",
      headers: dotsHeaders({ dotsAppId: DEFAULT_DOTS_APP_ID }),
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

  return NextResponse.json(data);
});
