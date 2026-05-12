import { createId } from "@/lib/api/create-id";
import { enqueueBatchJobs } from "@/lib/cron/enqueue-batch-jobs";
import { withCron } from "@/lib/cron/with-cron";
import { NETWORK_BONUS_REWARD } from "@/lib/partner-referrals/constants";
import { referralRewardConfigSchema } from "@/lib/partner-referrals/schemas";
import { prisma } from "@dub/prisma";
import { CommissionType } from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK, NETWORK_PROGRAM_ID } from "@dub/utils";
import { differenceInMonths } from "date-fns";
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
          type: CommissionType.referral,
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

  if (payout.status !== "sent") {
    return logAndRespond(`Payout ${payoutId} is not sent.`);
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

    // TODO:
    // Check the partner status

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
    const referrerEnrollment = await prisma.programEnrollment.findUnique({
      where: {
        partnerId_programId: {
          programId: NETWORK_PROGRAM_ID,
          partnerId: partner.referredByPartnerId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!referrerEnrollment) {
      return logAndRespond(
        `Referrer partner ${partner.referredByPartnerId} is not enrolled in network program.`,
      );
    }

    const firstCommission = await prisma.commission.findFirst({
      where: {
        programId: NETWORK_PROGRAM_ID,
        partnerId: partner.referredByPartnerId,
        sourcePartnerId: partner.id,
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        createdAt: true,
      },
    });

    if (firstCommission) {
      const durationMonths = differenceInMonths(
        new Date(),
        firstCommission.createdAt,
      );

      if (durationMonths >= NETWORK_BONUS_REWARD.maxDuration) {
        return logAndRespond(
          `Referrer partner ${partner.referredByPartnerId} has reached max duration for network bonus.`,
        );
      }
    }

    await prisma.commission.create({
      data: {
        id: createId({ prefix: "cm_" }),
        programId: NETWORK_PROGRAM_ID,
        partnerId: partner.referredByPartnerId,
        sourcePartnerId: partner.id,
        type: CommissionType.referral,
        amount: 0,
        quantity: 1,
        earnings:
          NETWORK_BONUS_REWARD.amountInPercentage * 0.01 * payout.amount,
        deduplicationKey: `referral:network:${payout.id}`,
      },
    });
  }

  return logAndRespond("OK");
});
