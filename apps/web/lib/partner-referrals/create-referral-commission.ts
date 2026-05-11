import { prisma } from "@dub/prisma";
import { Commission, CommissionType, Prisma } from "@dub/prisma/client";
import { log } from "@dub/utils";
import { differenceInMonths } from "date-fns";
import { createId } from "../api/create-id";
import { notifyPartnerCommission } from "../api/partners/notify-partner-commission";
import { syncTotalCommissions } from "../api/partners/sync-total-commissions";
import { referralRewardConfigSchema } from "../partner-referrals/schemas";
import { constructWebhookPartner } from "../partners/constuct-webhook-partner";
import { sendPartnerPostback } from "../postback/send-partner-postback";
import { sendWorkspaceWebhook } from "../webhook/publish";
import { CommissionWebhookSchema } from "../zod/schemas/commissions";

type CreateReferralCommissionProps =
  | { sourceCommissionId: string; partnerId?: never; programId?: never }
  | { sourceCommissionId?: never; partnerId: string; programId: string };

// 1 - both percentage
// 2 - flat: threashold
// 3 - flat: partner is approved

export const createReferralCommission = async (
  props: CreateReferralCommissionProps,
) => {
  const context = await resolveReferralContext(props);

  if (!context) {
    return null;
  }

  const { sourceCommission, programId, referredByPartnerId } = context;

  const referrerProgramEnrollment = await prisma.programEnrollment.findUnique({
    where: {
      partnerId_programId: {
        partnerId: referredByPartnerId,
        programId,
      },
    },
    include: {
      partner: true,
      links: true,
      referralReward: true,
      partnerGroup: true,
    },
  });

  if (!referrerProgramEnrollment) {
    console.log(
      `Referrer partner ${referredByPartnerId} is not enrolled in the program ${programId}.`,
    );
    return null;
  }

  const { referralReward } = referrerProgramEnrollment;

  if (!referralReward) {
    console.log(
      `Referrer partner ${referredByPartnerId} has no referral reward for the group in program ${programId}.`,
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

  let commissionData: Prisma.CommissionUncheckedCreateInput = {
    id: createId({ prefix: "cm_" }),
    type: "referral",
    amount: 0,
    quantity: 1,
    earnings: 0,
    programId,
    partnerId: referredByPartnerId,
    rewardId: referralReward.id,
  };

  const { trigger } = rewardConfig.data;

  // When reward is based on commission
  if (
    sourceCommission &&
    (trigger === "commissionEarned" || trigger === "saleRecorded")
  ) {
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

        if (
          referralReward.maxDuration === 0 &&
          subscriptionDurationMonths > 0
        ) {
          console.log(
            `Referrer ${referredByPartnerId} reached max duration (first-sale only) for referred partner ${sourceCommission.partnerId} for the customer ${sourceCommission.customerId}.`,
          );
          return null;
        }

        if (subscriptionDurationMonths >= referralReward.maxDuration) {
          console.log(
            `Referrer ${referredByPartnerId} reached max duration (${referralReward.maxDuration} months) for referred partner ${sourceCommission.partnerId} for the customer ${sourceCommission.customerId}.`,
          );
          return null;
        }
      }
    }

    if (trigger === "commissionEarned") {
      commissionData.earnings = Math.floor(
        (sourceCommission.earnings * amountInPercentage) / 100,
      );
    } else if (trigger === "saleRecorded") {
      commissionData.earnings = Math.floor(
        (sourceCommission.amount * amountInPercentage) / 100,
      );
    }

    commissionData = {
      ...commissionData,
      customerId: sourceCommission.customerId,
      currency: sourceCommission.currency,
      sourceCommissionId: sourceCommission.id,
      sourcePartnerId: sourceCommission.partnerId,
    };
  }

  // When reward is based on partner approval
  else if (trigger === "partnerApproved") {
    commissionData.earnings = referralReward.amountInCents ?? 0;
  }

  // When reward is based on commission threshold reached
  else if (trigger === "commissionThreshold") {
    // TODO: Implement partner metrics updated logic
  }

  if (commissionData.earnings === 0) {
    return null;
  }

  let commission: Commission;

  try {
    commission = await prisma.commission.create({
      data: commissionData,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      console.log(
        `Referral commission already exists for source commission ${sourceCommission?.id} and referrer ${referredByPartnerId}, skipping...`,
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

  const program = await prisma.program.findUniqueOrThrow({
    where: {
      id: programId,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      supportEmail: true,
      groups: true,
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
          webhookEnabled: true,
        },
      },
    },
  });

  await Promise.allSettled([
    sendWorkspaceWebhook({
      workspace: program.workspace,
      trigger: "commission.created",
      data: CommissionWebhookSchema.parse({
        ...commission,
        partner: constructWebhookPartner(referrerProgramEnrollment),
      }),
    }),

    sendPartnerPostback({
      partnerId: referredByPartnerId,
      event: "commission.created",
      data: commission,
    }),

    syncTotalCommissions({
      partnerId: referredByPartnerId,
      programId,
    }),

    notifyPartnerCommission({
      workspace: program.workspace,
      program,
      commission,
      group: referrerProgramEnrollment.partnerGroup ?? program.groups[0],
      isFirstCommission: true,
    }),
  ]);
};

async function resolveReferralContext(props: CreateReferralCommissionProps) {
  // Percentage referral reward
  if (props.sourceCommissionId) {
    const sourceCommissionId = props.sourceCommissionId;
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

    return {
      sourceCommission,
      programId: sourceCommission.programId,
      referredByPartnerId,
    };
  }

  // partnerApproved referral reward
  if (props.partnerId && props.programId) {
    const programEnrollment = await prisma.programEnrollment.findUnique({
      where: {
        partnerId_programId: {
          partnerId: props.partnerId,
          programId: props.programId,
        },
      },
      select: {
        programId: true,
        partnerId: true,
        status: true,
        applicationEvent: {
          select: {
            referredByPartnerId: true,
          },
        },
      },
    });

    if (!programEnrollment) {
      console.log(
        `Partner ${props.partnerId} is not enrolled in the program ${props.programId}.`,
      );
      return null;
    }

    if (programEnrollment.status !== "approved") {
      console.log(
        `Partner ${props.partnerId} is not approved in the program ${props.programId}.`,
      );
      return null;
    }

    const referredByPartnerId =
      programEnrollment?.applicationEvent?.referredByPartnerId;

    if (!referredByPartnerId) {
      console.log(
        `Referrer partner ${props.partnerId} is not associated with a referred partner.`,
      );
      return null;
    }

    return {
      sourceCommission: null,
      programId: programEnrollment.programId,
      referredByPartnerId,
    };
  }
}
