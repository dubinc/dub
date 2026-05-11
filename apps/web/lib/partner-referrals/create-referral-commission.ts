import { prisma } from "@dub/prisma";
import { Commission, CommissionType, Prisma } from "@dub/prisma/client";
import { currencyFormatter, log, prettyPrint } from "@dub/utils";
import { differenceInMonths } from "date-fns";
import { createId } from "../api/create-id";
import { syncTotalCommissions } from "../api/partners/sync-total-commissions";
import { referralRewardConfigSchema } from "../partner-referrals/schemas";

type CreateReferralCommissionProps = {
  sourceCommissionId: string;
};

export const createReferralCommission = async ({
  sourceCommissionId,
}: CreateReferralCommissionProps) => {
  const sourceCommission = await prisma.commission.findUnique({
    where: {
      id: sourceCommissionId,
    },
    include: {
      programEnrollment: {
        select: {
          programId: true,
          partnerId: true,
          applicationEvent: {
            select: {
              referredByPartnerId: true,
            },
          },
        },
      },
    },
  });

  if (!sourceCommission) {
    console.log(`Source commission ${sourceCommissionId} not found.`);
    return null;
  }

  // We only support referral commissions for sale commissions currently
  if (sourceCommission.type !== CommissionType.sale) {
    console.log(
      `Source commission ${sourceCommissionId} is not a sale commission.`,
    );
    return null;
  }

  if (!["processed", "paid"].includes(sourceCommission.status)) {
    console.log(
      `Source commission ${sourceCommissionId} is not a processed or paid.`,
    );
    return null;
  }

  const referredByPartnerId =
    sourceCommission.programEnrollment?.applicationEvent?.referredByPartnerId;

  if (!referredByPartnerId) {
    console.log(
      `Source commission ${sourceCommissionId} is not associated with a referred partner.`,
    );
    return null;
  }

  const referrerProgramEnrollment = await prisma.programEnrollment.findUnique({
    where: {
      partnerId_programId: {
        partnerId: referredByPartnerId,
        programId: sourceCommission.programId,
      },
    },
    select: {
      programId: true,
      partnerId: true,
      referralReward: true,
    },
  });

  if (!referrerProgramEnrollment) {
    console.log(
      `Referrer partner ${referredByPartnerId} is not enrolled in the program ${sourceCommission.programId}.`,
    );
    return null;
  }

  const { programId, partnerId, referralReward } = referrerProgramEnrollment;

  if (!referralReward) {
    console.log(
      `Referrer partner ${referredByPartnerId} has no referral reward for the group.`,
    );
    return null;
  }

  // TODO: Fix this and support flat fee as well
  if (referralReward.type !== "percentage") {
    console.log(
      `Referral reward ${referralReward.id} is not a percentage reward.`,
    );
    return null;
  }

  const existingReferralCommission = await prisma.commission.findUnique({
    where: {
      sourceCommissionId: sourceCommission.id,
    },
    select: {
      id: true,
    },
  });

  if (existingReferralCommission) {
    console.log(
      `Referral commission already exists for source commission ${sourceCommission.id}.`,
    );
    return null;
  }

  const rewardConfig = referralRewardConfigSchema.safeParse(
    referralReward.config,
  );

  if (!rewardConfig.success) {
    console.log(`Referral reward ${referralReward.id} has an invalid config.`);
    return null;
  }

  const { trigger } = rewardConfig.data;
  const amountInPercentage = Number(referralReward.amountInPercentage ?? 0);

  if (typeof referralReward.maxDuration === "number") {
    const firstCommission = await prisma.commission.findFirst({
      where: {
        partnerId: sourceCommission.partnerId,
        programId: sourceCommission.programId,
        type: "sale",
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        createdAt: true,
      },
    });

    if (firstCommission) {
      const subscriptionDurationMonths = differenceInMonths(
        sourceCommission.createdAt,
        firstCommission.createdAt,
      );

      if (referralReward.maxDuration === 0 && subscriptionDurationMonths > 0) {
        console.log(
          `Referrer ${partnerId} reached max duration (first-sale only) for referred partner ${sourceCommission.partnerId} for the customer ${sourceCommission.customerId}.`,
        );
        return null;
      }

      if (subscriptionDurationMonths >= referralReward.maxDuration) {
        console.log(
          `Referrer ${partnerId} reached max duration (${referralReward.maxDuration} months) for referred partner ${sourceCommission.partnerId} for the customer ${sourceCommission.customerId}.`,
        );
        return null;
      }
    }
  }

  let earnings = 0;

  if (trigger === "commissionEarned") {
    earnings = Math.floor(
      (sourceCommission.earnings * amountInPercentage) / 100,
    );
  } else if (trigger === "saleRecorded") {
    earnings = Math.floor((sourceCommission.amount * amountInPercentage) / 100);
  } else {
    console.log(`Referral reward trigger ${trigger} is not supported.`);
    return null;
  }

  if (earnings === 0) {
    console.log(
      `Referral commission for source commission ${sourceCommission.id} and referrer partner ${partnerId} is 0.`,
    );
    return null;
  }

  let commission: Commission;

  try {
    commission = await prisma.commission.create({
      data: {
        id: createId({ prefix: "cm_" }),
        programId,
        partnerId,
        rewardId: referralReward.id,
        customerId: sourceCommission.customerId,
        sourceCommissionId: sourceCommission.id,
        type: "referral",
        amount: 0,
        quantity: 1,
        earnings,
        currency: sourceCommission.currency,
        createdAt: sourceCommission.createdAt,
      },
    });

    console.log(
      `Created a referral commission ${commission.id} (${currencyFormatter(commission.earnings, { currency: commission.currency })}) for referrer ${partnerId} from source commission ${sourceCommission.id}: ${prettyPrint(commission)}`,
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      console.log(
        `Referral commission already exists for source commission ${sourceCommission.id} and referrer ${partnerId}, skipping...`,
      );
      return null;
    }

    console.error("Error creating referral commission", error);

    await log({
      message: `Error creating referral commission - ${error.message}`,
      type: "errors",
      mention: true,
    });

    return null;
  }

  // TODO:
  // sendWorkspaceWebhook
  // sendPartnerPostback
  // notifyPartnerCommission (only to partner)
  // executeWorkflows

  await Promise.allSettled([
    syncTotalCommissions({
      partnerId,
      programId,
    }),
  ]);

  return commission;
};
