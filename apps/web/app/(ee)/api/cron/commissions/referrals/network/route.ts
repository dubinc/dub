import { withCron } from "@/lib/cron/with-cron";
import { createNetworkReferralCommission } from "@/lib/partner-referrals/create-network-referral-commission";
import { prisma } from "@dub/prisma";
import * as z from "zod/v4";
import { logAndRespond } from "../../../utils";

export const dynamic = "force-dynamic";

const inputSchema = z.object({
  payoutId: z.string(),
});

// POST /api/cron/commissions/referrals/network
// Creates a network referral commission for the referrer when a referred partner's payout is sent or completed.
export const POST = withCron(async ({ rawBody }) => {
  const { payoutId } = inputSchema.parse(JSON.parse(rawBody));

  const payout = await prisma.payout.findUnique({
    where: {
      id: payoutId,
    },
    include: {
      partner: {
        select: {
          id: true,
          referredByPartnerId: true,
        },
      },
    },
  });

  if (!payout) {
    return logAndRespond(`Payout ${payoutId} not found.`);
  }

  if (!["sent", "completed"].includes(payout.status)) {
    return logAndRespond(
      `Payout ${payoutId} is not in a valid status to create referral commissions.`,
    );
  }

  const commission = await createNetworkReferralCommission({
    partner: payout.partner,
    payout,
  });

  if (commission) {
    return logAndRespond(
      `Created network referral commission for payout ${payout.id}.`,
    );
  }

  return logAndRespond(
    `No referral commission created for payout ${payout.id}.`,
  );
});
