import { prisma } from "@dub/prisma";
import {
  Commission,
  Prisma,
  ProgramEnrollment,
  Reward,
} from "@dub/prisma/client";
import { currencyFormatter, log, prettyPrint } from "@dub/utils";
import { differenceInMonths } from "date-fns";
import { createId } from "../api/create-id";
import { syncTotalCommissions } from "../api/partners/sync-total-commissions";
import { referralRewardConfigSchema } from "../partner-referrals/schemas";

type CreateReferralCommissionProps = {
  referrerProgramEnrollment: Pick<ProgramEnrollment, "programId" | "partnerId">; // Referrer's program enrollment
  referralReward: Reward;
  sourceCommission: Pick<
    Commission,
    | "id"
    | "programId"
    | "partnerId"
    | "customerId"
    | "earnings"
    | "amount"
    | "currency"
    | "createdAt"
  >;
};

// type CommissionResponse = {
//   commission?: Commission | null;
//   shouldRetry: boolean;
// };

export const createReferralCommission = async ({
  referrerProgramEnrollment: { programId, partnerId },
  referralReward,
  sourceCommission,
}: CreateReferralCommissionProps) => {
  // flat triggers (partnerApproved / commissionThreshold) live in dedicated paths
  // TODO: Fix this
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
  // notifyPartnerCommission
  // executeWorkflows

  await Promise.allSettled([
    syncTotalCommissions({
      partnerId,
      programId,
    }),
  ]);

  return commission;
};
