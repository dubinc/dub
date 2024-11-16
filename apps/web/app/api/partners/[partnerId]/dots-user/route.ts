import { withPartner } from "@/lib/auth/partner";
import { retrieveDotsFlow } from "@/lib/dots/retrieve-dots-flow";
import { retrieveDotsUser } from "@/lib/dots/retrieve-dots-user";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/upstash";
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

  const dotsUser = await retrieveDotsUser(partner);

  return NextResponse.json(dotsUser);
});
