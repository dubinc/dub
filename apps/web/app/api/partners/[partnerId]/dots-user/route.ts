import { withPartner } from "@/lib/auth/partner";
import { DOTS_API_URL } from "@/lib/dots/env";
import { retrieveDotsFlow } from "@/lib/dots/retrieve-dots-flow";
import { retrieveDotsUser } from "@/lib/dots/retrieve-dots-user";
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

  const [dotsUser, payout_methods] = await Promise.all([
    retrieveDotsUser({ dotsUserId, partner }),
    fetch(`${DOTS_API_URL}/users/${dotsUserId}/payout-methods`, {
      method: "GET",
      headers: dotsHeaders({ dotsAppId: DEFAULT_DOTS_APP_ID }),
    }).then((res) => res.json()),
  ]);

  return NextResponse.json({
    ...dotsUser,
    payout_methods: payout_methods.map((method) => ({
      ...method,
      default: dotsUser.default_payout_method === method.platform,
    })),
  });
});
