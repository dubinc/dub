import { enqueueBatchJobs } from "@/lib/cron/enqueue-batch-jobs";
import { withCron } from "@/lib/cron/with-cron";
import { createNetworkReferralCommission } from "@/lib/partner-referrals/create-network-referral-commission";
import { referralRewardConfigSchema } from "@/lib/zod/schemas/rewards";
import { prisma } from "@dub/prisma";
import { CommissionType } from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK, NETWORK_PROGRAM_ID } from "@dub/utils";
import * as z from "zod/v4";
import { logAndRespond } from "../../../utils";

export const dynamic = "force-dynamic";

const inputSchema = z.object({
  payoutId: z.string(),
});

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
      invoice: {
        select: {
          amount: true,
          fee: true,
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

  const { programId, partner, programEnrollment, commissions } = payout;

  // Check the program level referral reward
  const referredByPartnerId =
    programEnrollment?.applicationEvent?.referredByPartnerId;

  if (referredByPartnerId) {
    const referrerEnrollment = await prisma.programEnrollment.findUnique({
      where: {
        partnerId_programId: {
          programId,
          partnerId: referredByPartnerId,
        },
      },
      select: {
        partnerId: true,
        referralReward: true,
      },
    });

    if (!referrerEnrollment) {
      return logAndRespond(
        `Referrer partner ${referredByPartnerId} is not enrolled in program ${programId}.`,
      );
    }

    const { referralReward } = referrerEnrollment;

    if (referralReward) {
      const { trigger } = referralRewardConfigSchema.parse(
        referralReward.config,
      );

      if (trigger === "commissionThreshold") {
        await enqueueBatchJobs([
          {
            queueName: "create-referral-commissions",
            url: `${APP_DOMAIN_WITH_NGROK}/api/cron/commissions/referrals/create`,
            deduplicationId: `create-referral-commissions-${payout.id}`,
            body: {
              programId,
              partnerId: partner.id,
            },
          },
        ]);

        return logAndRespond(`Enqueued referral-eligible payout ${payout.id}.`);
      }

      await enqueueBatchJobs(
        commissions.map((commission) => ({
          queueName: "create-referral-commissions",
          url: `${APP_DOMAIN_WITH_NGROK}/api/cron/commissions/referrals/create`,
          deduplicationId: `create-referral-commissions-${commission.id}`,
          body: {
            sourceCommissionId: commission.id,
          },
        })),
      );

      return logAndRespond(
        `Enqueued ${commissions.length} referral-eligible commissions for payout ${payout.id}.`,
      );
    }
  }

  // Fallback to network level bonus
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
