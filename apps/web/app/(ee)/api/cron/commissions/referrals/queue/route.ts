import { withCron } from "@/lib/cron/with-cron";
import { createNetworkReferralCommission } from "@/lib/partner-referrals/create-network-referral-commission";
import { prisma } from "@dub/prisma";
import { CommissionType } from "@dub/prisma/client";
import { NETWORK_PROGRAM_ID } from "@dub/utils";
import * as z from "zod/v4";
import { logAndRespond } from "../../../utils";

export const dynamic = "force-dynamic";

const inputSchema = z.object({
  payoutId: z.string(),
});

// Queue a payout to create Network referral commissions
// POST /api/cron/commissions/referrals/queue
export const POST = withCron(async ({ rawBody }) => {
  const { payoutId } = inputSchema.parse(JSON.parse(rawBody));

  const payout = await prisma.payout.findUnique({
    where: {
      id: payoutId,
    },
    select: {
      id: true,
      status: true,
      programId: true,
      amount: true,
      partner: {
        select: {
          id: true,
          referredByPartnerId: true,
        },
      },
      programEnrollment: {
        select: {
          applicationEvent: {
            select: {
              referredByPartnerId: true,
            },
          },
        },
      },
      commissions: {
        where: {
          type: CommissionType.sale,
        },
        select: {
          id: true,
        },
      },
    },
  });

  if (!payout) {
    return logAndRespond(`Payout ${payoutId} not found.`);
  }

  if (payout.programId === NETWORK_PROGRAM_ID) {
    return logAndRespond(
      `Payout ${payoutId} is from Network program. Skipping...`,
    );
  }

  if (!["sent", "completed"].includes(payout.status)) {
    return logAndRespond(
      `Payout ${payoutId} is not in a valid status to create referrals.`,
    );
  }

  const { partner } = payout;

  if (partner.referredByPartnerId) {
    const commission = await createNetworkReferralCommission({
      partner,
      payout,
    });

    if (commission) {
      return logAndRespond(
        `Created network referral commission for payout ${payout.id}.`,
      );
    }
  }

  return logAndRespond(
    `No referral commission created for payout ${payout.id}.`,
  );
});
