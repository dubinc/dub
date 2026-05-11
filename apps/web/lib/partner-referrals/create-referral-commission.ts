import { prisma } from "@dub/prisma";
import { Commission, CommissionType, Prisma } from "@dub/prisma/client";
import { log } from "@dub/utils";
import { differenceInMonths } from "date-fns";
import { triggerAggregateDueCommissionsCronJob } from "../actions/partners/trigger-aggregate-due-commissions";
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

export const createReferralCommission = async (
  props: CreateReferralCommissionProps,
) => {
  const context = await resolveReferralContext(props);

  if (!context) {
    return null;
  }

  const { sourceCommission, programId, partnerId, referredByPartnerId } =
    context;

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
    sourcePartnerId: partnerId,
    partnerId: referredByPartnerId,
    rewardId: referralReward.id,
  };

  const { trigger } = rewardConfig.data;

  // When reward is based on commission earned or sale recorded
  if (
    sourceCommission &&
    (trigger === "commissionEarned" || trigger === "saleRecorded")
  ) {
    const amountInPercentage = Number(referralReward.amountInPercentage ?? 0);

    if (typeof referralReward.maxDuration === "number") {
      const firstCommission = await prisma.commission.findFirst({
        where: {
          partnerId,
          programId,
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
            `Referrer ${referredByPartnerId} reached max duration (first-sale only) for referred partner ${partnerId} for the customer ${sourceCommission.customerId}.`,
          );
          return null;
        }

        if (subscriptionDurationMonths >= referralReward.maxDuration) {
          console.log(
            `Referrer ${referredByPartnerId} reached max duration (${referralReward.maxDuration} months) for referred partner ${partnerId} for the customer ${sourceCommission.customerId}.`,
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
      deduplicationKey: `referral:${trigger}:${sourceCommission.id}`,
    };
  }

  // When reward is based on partner approval
  else if (trigger === "partnerApproved") {
    commissionData = {
      ...commissionData,
      earnings: referralReward.amountInCents ?? 0,
      deduplicationKey: `referral:${trigger}:${partnerId}`,
    };
  }

  // When reward is based on commission threshold reached
  else if (trigger === "commissionThreshold") {
    const {
      _sum: { earnings: totalCommissionsEarned },
    } = await prisma.commission.aggregate({
      where: {
        partnerId,
        programId,
        type: "sale",
      },
      _sum: {
        earnings: true,
      },
    });

    if ((totalCommissionsEarned ?? 0) < (referralReward.amountInCents ?? 0)) {
      console.log(
        `Referrer ${referredByPartnerId} has not reached the commission threshold for referred partner ${partnerId}.`,
      );
      return null;
    }

    commissionData = {
      ...commissionData,
      earnings: referralReward.amountInCents ?? 0,
      deduplicationKey: `referral:${trigger}:${partnerId}`,
    };
  }

  // When reward is based on unknown trigger
  else {
    console.log(
      `Invalid trigger ${trigger} for referral reward ${referralReward.id}.`,
    );
    return null;
  }

  if (commissionData.earnings === 0) {
    return null;
  }

  // Check if the commission already exists using the deduplication key
  if (commissionData.deduplicationKey) {
    const existingCommission = await prisma.commission.findUnique({
      where: {
        programId_deduplicationKey: {
          programId,
          deduplicationKey: commissionData.deduplicationKey,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingCommission) {
      console.log(
        `Referral commission ${existingCommission.id} already exists for the deduplication key ${commissionData.deduplicationKey}.`,
      );
      return null;
    }
  }

  let commission: Commission;

  try {
    commission = await prisma.commission.create({
      data: commissionData,
    });
  } catch (error) {
    // Don't retry on unique constraint violation – the commission already exists
    // (likely a race between the dedup check and the create)
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      console.log(
        `Referral commission already exists for deduplication key ${commissionData.deduplicationKey}, skipping creation.`,
      );
      return null;
    }

    console.error("Error creating referral commission", error);

    await log({
      message: `Error creating referral commission - ${error.message}`,
      type: "errors",
      mention: true,
    });

    throw error;
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
        link: null,
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

    triggerAggregateDueCommissionsCronJob(programId),
  ]);

  return commission;
};

async function resolveReferralContext(props: CreateReferralCommissionProps) {
  if (props.sourceCommissionId) {
    const { sourceCommissionId } = props;

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
      partnerId: sourceCommission.partnerId,
      referredByPartnerId,
    };
  }

  if (props.partnerId && props.programId) {
    const { partnerId, programId } = props;

    const programEnrollment = await prisma.programEnrollment.findUnique({
      where: {
        partnerId_programId: {
          partnerId,
          programId,
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
        `Partner ${partnerId} is not enrolled in the program ${programId}.`,
      );
      return null;
    }

    if (programEnrollment.status !== "approved") {
      console.log(
        `Partner ${partnerId} is not approved in the program ${programId}.`,
      );
      return null;
    }

    const referredByPartnerId =
      programEnrollment?.applicationEvent?.referredByPartnerId;

    if (!referredByPartnerId) {
      console.log(
        `Referrer partner ${partnerId} is not associated with a referred partner.`,
      );
      return null;
    }

    return {
      sourceCommission: null,
      programId,
      partnerId,
      referredByPartnerId,
    };
  }
}
