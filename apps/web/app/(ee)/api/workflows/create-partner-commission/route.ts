import { triggerAggregateDueCommissionsCronJob } from "@/lib/actions/partners/trigger-aggregate-due-commissions";
import { trackCommissionStatusUpdate } from "@/lib/api/commissions/track-commission-update-activity-log";
import { createId } from "@/lib/api/create-id";
import { PARTNER_LEVEL_FRAUD_RULES } from "@/lib/api/fraud/constants";
import { detectAndRecordFraudEvent } from "@/lib/api/fraud/detect-record-fraud-event";
import { notifyPartnerCommission } from "@/lib/api/partners/notify-partner-commission";
import { syncTotalCommissions } from "@/lib/api/partners/sync-total-commissions";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { getRewardSpendLimitWindow } from "@/lib/api/rewards/reward-spend-limit-window";
import { calculateSaleEarnings } from "@/lib/api/sales/calculate-sale-earnings";
import { executeWorkflows } from "@/lib/api/workflows/execute-workflows";
import { logger } from "@/lib/axiom/server";
import { getWorkflowConfig } from "@/lib/cron/qstash-workflow";
import { constructWebhookPartner } from "@/lib/partners/constuct-webhook-partner";
import { determinePartnerRewards } from "@/lib/partners/determine-partner-reward";
import { getRewardAmount } from "@/lib/partners/get-reward-amount";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { sendPartnerPostback } from "@/lib/postback/send-partner-postback";
import { prisma } from "@/lib/prisma";
import { RewardProps } from "@/lib/types";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import {
  CommissionWebhookSchema,
  createPartnerCommissionSchema,
} from "@/lib/zod/schemas/commissions";
import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import { COMMISSION_ELIGIBLE_ENROLLMENT_STATUSES } from "@/lib/zod/schemas/partners";
import { buildCommissionDescription } from "@/ui/partners/program-reward-spend-limit";
import { currencyFormatter, log, pick, toCentsNumber } from "@dub/utils";
import {
  Commission,
  CommissionStatus,
  FraudEventStatus,
  Link,
  Partner,
  PartnerGroup,
  Prisma,
  ProgramEnrollment,
  Reward,
} from "@prisma/client";
import { WorkflowRetryAfterError } from "@upstash/workflow";
import { serve } from "@upstash/workflow/nextjs";
import { differenceInMonths } from "date-fns";
import * as z from "zod/v4";
import { logAndReturn } from "../../cron/utils";

type Input = z.infer<typeof createPartnerCommissionSchema>;

type ProgramEnrollmentWithReward = ProgramEnrollment & {
  links: Link[];
  partner: Partner;
  partnerGroup: PartnerGroup | null;
  clickReward?: Reward | null;
  leadReward?: Reward | null;
  saleReward?: Reward | null;
};

type StepFunctionInput = Input & {
  programEnrollment: ProgramEnrollmentWithReward;
  isFirstCommission?: boolean;
};

type StepCreateCommissionOutput = {
  commission: Pick<Commission, "id"> | null;
  outputLog: string;
  isFirstCommission?: boolean;
};

const commissionInclude: Prisma.CommissionInclude = {
  customer: true,
  link: {
    select: {
      id: true,
      shortLink: true,
      domain: true,
      key: true,
    },
  },
};

// POST /api/workflows/create-partner-commission
export const { POST } = serve<Input>(
  async (context) => {
    const input = context.requestPayload;
    const { event, partnerId, programId, bountySubmissionId } = input;

    const programEnrollment = await getProgramEnrollmentOrThrow({
      partnerId,
      programId,
      include: {
        links: true,
        partner: true,
        partnerGroup: true,
        ...(event === "lead" && { leadReward: true }),
        ...(event === "sale" && { saleReward: true }),
      },
    });

    // Step 1: Create commission
    const { commission, isFirstCommission } = await context.run(
      "create-commission",
      async () => {
        return await stepCreateCommission({
          ...input,
          programEnrollment,
        });
      },
    );

    // Step 2: Run side effects
    await context.run("run-side-effects", async () => {
      return await stepRunSideEffects({
        ...input,
        programEnrollment,
        commission,
        isFirstCommission,
      });
    });

    // Step 3 (optional): Link the created commission to the bounty submission
    if (commission && bountySubmissionId) {
      await context.run("set-bounty-commission", async () => {
        const { count } = await prisma.bountySubmission.updateMany({
          where: {
            id: bountySubmissionId,
            status: "approved",
            commissionId: null,
          },
          data: {
            commissionId: commission.id,
          },
        });

        if (count) {
          return logAndReturn({
            outputLog: `Linked commission ${commission.id} to bounty submission ${bountySubmissionId}`,
          });
        } else {
          return logAndReturn({
            outputLog: `Bounty submission ${bountySubmissionId} not found or already linked to a commission, skipping...`,
          });
        }
      });
    }
  },
  {
    initialPayloadParser: (requestPayload) => {
      return createPartnerCommissionSchema.parse(JSON.parse(requestPayload));
    },
    failureFunction: async ({
      context,
      failStatus,
      failResponse,
      failHeaders,
    }) => {
      const { correlation } = getWorkflowConfig({
        workflowType: "create-partner-commission",
        body: context.requestPayload,
      });

      logger.error("workflow.failed", {
        service: "qstash",
        event: "workflow.failed",
        workflowType: "create-partner-commission",
        workflowRunId: context.workflowRunId,
        failStatus,
        failResponse,
        failHeaders,
        correlation,
      });

      await logger.flush();
    },
  },
);

async function stepCreateCommission(
  input: StepFunctionInput,
): Promise<StepCreateCommissionOutput> {
  let {
    event,
    partnerId,
    programId,
    linkId,
    customerId,
    eventId,
    invoiceId,
    amount,
    quantity,
    currency,
    description,
    createdAt,
    status,
    userId,
    context,
    programEnrollment,
  } = input;

  if (typeof amount !== "number") {
    amount = 0;
  }

  // Skip invalid reward events (should never happen, but just in case)
  if (event === "click" || event === "referral") {
    return logAndReturn({
      commission: null,
      outputLog: `"${event}" commissions are not created via this workflow. Skipping commission creation...`,
    });
  }

  // for lead / sale rewards, we need to check if the partner is eligible for commissions
  if (
    ["lead", "sale"].includes(event) &&
    !COMMISSION_ELIGIBLE_ENROLLMENT_STATUSES.includes(programEnrollment.status)
  ) {
    return logAndReturn({
      commission: null,
      outputLog: `Partner ${partnerId} is not eligible for commissions (status: ${programEnrollment.status}) in program ${programId}, skipping ${event} commission creation...`,
    });
  }

  let earnings = 0;
  let reward: RewardProps | null = null;
  let firstCommission: Pick<
    Commission,
    "rewardId" | "status" | "createdAt"
  > | null = null;

  if (event === "custom") {
    earnings = amount;
    amount = 0;
  } else {
    if (customerId) {
      firstCommission = await prisma.commission.findFirst({
        where: {
          partnerId,
          customerId,
          type: event,
        },
        orderBy: {
          createdAt: "asc",
        },
        select: {
          rewardId: true,
          status: true,
          createdAt: true,
        },
      });

      const subscriptionStartDate =
        event === "sale" ? firstCommission?.createdAt ?? new Date() : undefined;

      const subscriptionDurationMonths = subscriptionStartDate
        ? differenceInMonths(
            createdAt ?? new Date(), // account for custom commission creation date
            subscriptionStartDate,
          )
        : 0;

      context = {
        ...context,
        customer: {
          ...context?.customer,
          subscriptionStartDate,
          subscriptionDurationMonths,
        },
        ...(event === "sale" && {
          sale: {
            ...context?.sale,
            type: firstCommission ? "recurring" : "new",
          },
        }),
      };
    }

    const rewards = determinePartnerRewards({
      event,
      programEnrollment,
      context,
      amount,
      quantity,
    });

    if (rewards.length > 0) {
      reward = rewards[0].reward;
    }

    // if there is no reward, skip commission creation
    if (!reward) {
      return logAndReturn({
        commission: null,
        outputLog: `Partner ${partnerId} has no reward for ${event} event, skipping commission creation...`,
      });
    }

    // for lead and sale events, we need to check if this partner-customer combination was recorded already (for deduplication)
    // for sale rewards specifically, we also need to check:
    // 1. if the partner has reached the max duration for the reward (if applicable)
    // 2. if the previous commission were marked as fraud or canceled
    if (firstCommission) {
      // if first commission is fraud or canceled, skip commission creation
      if (["fraud", "canceled"].includes(firstCommission.status)) {
        return logAndReturn({
          commission: null,
          outputLog: `Partner ${partnerId} has a first commission that is ${firstCommission.status}, skipping commission creation...`,
        });
      }

      // for lead events, we need to check if the partner has already been issued a lead reward for this customer
      if (event === "lead") {
        return logAndReturn({
          commission: null,
          outputLog: `Partner ${partnerId} has already been issued a lead reward for this customer ${customerId}, skipping commission creation...`,
        });

        // for sale rewards, we need to check if partner's reward was updated and different from the first commission's reward
        // we need to make sure it wasn't changed from one-time to recurring so we don't create a new commission
      } else {
        if (
          firstCommission.rewardId &&
          firstCommission.rewardId !== reward.id
        ) {
          const originalReward = await prisma.reward.findUnique({
            where: {
              id: firstCommission.rewardId,
            },
            select: {
              id: true,
              maxDuration: true,
            },
          });

          if (
            typeof originalReward?.maxDuration === "number" &&
            originalReward.maxDuration === 0
          ) {
            return logAndReturn({
              commission: null,
              outputLog: `Partner ${partnerId} is only eligible for first-sale commissions based on the original reward ${originalReward.id}, skipping commission creation...`,
            });
          }
        }

        // for sale rewards with a max duration, we need to check if the first commission is within the max duration
        // if it's beyond the max duration, we should not create a new commission
        if (typeof reward?.maxDuration === "number") {
          // One-time sale reward (maxDuration === 0)
          if (reward.maxDuration === 0) {
            return logAndReturn({
              commission: null,
              outputLog: `Partner ${partnerId} is only eligible for first-sale commissions, skipping commission creation...`,
            });
          }

          // Recurring sale reward (maxDuration > 0)
          else {
            const subscriptionDurationMonths = differenceInMonths(
              createdAt ?? new Date(), // account for custom commission creation date
              firstCommission.createdAt,
            );

            if (subscriptionDurationMonths >= reward.maxDuration) {
              return logAndReturn({
                commission: null,
                outputLog: `Partner ${partnerId} has reached max duration for ${event} event (subscription duration: ${subscriptionDurationMonths} months, max duration: ${reward.maxDuration} months), skipping commission creation...`,
              });
            }
          }
        }
      }
    }

    // for lead events, we just multiply the reward amount by the quantity
    if (event === "lead") {
      earnings = getRewardAmount(reward) * quantity;
    }
    // for sale events, we need to calculate the earnings based on the sale amount
    else {
      earnings = rewards.reduce(
        (acc, { reward, sale }) =>
          acc +
          calculateSaleEarnings({
            reward,
            sale,
          }),
        0,
      );
    }
  }

  // skip commission creation if the earnings is zero
  if (earnings === 0) {
    return logAndReturn({
      commission: null,
      outputLog: `Partner ${partnerId} has zero earnings for ${event} event, skipping commission creation...`,
    });
  }

  if (
    customerId &&
    event !== "custom" &&
    reward &&
    reward.spendLimitAmount &&
    reward.spendLimitInterval
  ) {
    const cappedEarnings = await clampEarningsToSpendLimit({
      reward,
      earnings,
      programId,
      partnerId,
      customerId,
      referenceDate: createdAt ?? new Date(),
    });

    // If spend limit clamped earnings to 0, skip commission creation
    if (cappedEarnings === 0) {
      return logAndReturn({
        commission: null,
        outputLog: `Partner ${partnerId} has reached spend limit (${currencyFormatter(reward.spendLimitAmount)} ${reward.spendLimitInterval === "allTime" ? "" : `per ${reward.spendLimitInterval}`}) for ${event} event, skipping commission creation...`,
      });
    }

    if (!description) {
      description = buildCommissionDescription({
        earnings,
        cappedEarnings,
        reward,
      });
    }

    earnings = cappedEarnings;
  }

  try {
    const commission = await prisma.commission.create({
      data: {
        id: createId({ prefix: "cm_" }),
        programId,
        partnerId,
        rewardId: reward?.id,
        customerId,
        linkId,
        eventId: eventId || null, // empty string should convert to null
        invoiceId: invoiceId || null, // empty string should convert to null
        userId,
        quantity,
        amount,
        type: event,
        currency,
        earnings,
        status,
        description,
        createdAt,
      },
    });

    const isFirstCommission =
      event !== "custom" ? firstCommission === null : undefined;

    return logAndReturn({
      commission,
      isFirstCommission,
      outputLog: `Created a ${event} commission ${commission.id} (${currencyFormatter(commission.earnings, { currency: commission.currency })}) for ${partnerId}`,
    });
  } catch (error) {
    const outputLog = `Error creating commission - ${error.message}`;

    // only log to Slack if the error is not a unique constraint violation
    if (error.code !== "P2002") {
      await log({
        message: outputLog,
        type: "errors",
        mention: true,
      });

      // Retry after 5 seconds
      throw new WorkflowRetryAfterError(error.message, "5s");
    }

    return logAndReturn({
      commission: null,
      outputLog,
    });
  }
}

async function stepRunSideEffects(
  input: StepFunctionInput & {
    commission: Pick<Commission, "id"> | null;
  },
) {
  const {
    commission: _commission,
    programEnrollment,
    isFirstCommission,
    programId,
    partnerId,
    linkId,
    eventId,
    skipWorkflow,
    clickEvent,
    isFirstConversion,
    status,
    triggerAggregateDueCommissions,
  } = input;

  if (!_commission) {
    return logAndReturn({
      outputLog: "Commission was not created. Skipping side effects...",
    });
  }

  let commission = await prisma.commission.findUniqueOrThrow({
    where: {
      id: _commission.id,
    },
    include: commissionInclude,
  });

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
      workspace: {
        select: {
          id: true,
          slug: true,
          name: true,
          webhookEnabled: true,
          plan: true,
        },
      },
      // if no partner group is found, need to fetch default group to fallback to
      ...(!programEnrollment.partnerGroup && {
        groups: {
          select: {
            holdingPeriodDays: true,
          },
          where: {
            slug: DEFAULT_PARTNER_GROUP.slug,
          },
        },
      }),
    },
  });

  const { workspace } = program;
  const isClawback = commission.earnings < 0;
  const shouldRunRiskMonitoring = commission.customer && eventId && clickEvent;
  let riskRulesTriggered = false;

  if (shouldRunRiskMonitoring) {
    const triggeredRules = await detectAndRecordFraudEvent({
      program: { id: programId },
      partner: pick(programEnrollment.partner, ["id", "email", "name"]),
      programEnrollment: pick(programEnrollment, [
        "status",
        "riskMonitoringDisabledAt",
      ]),
      customer: {
        ...pick(commission.customer!, ["id", "email", "name"]),
        // only pass along isFirstConversion if it's a boolean
        ...(typeof isFirstConversion === "boolean" && { isFirstConversion }),
      },
      link: { id: linkId },
      click: pick(clickEvent, ["url", "referer"]),
      event: { id: eventId },
    });

    riskRulesTriggered = triggeredRules.length > 0;
  }

  const { canManageFraudEvents } = getPlanCapabilities(program.workspace.plan);

  // 1. Partner-level: any pending partner-scope fraud group -> hold (all commission types for this partner).
  // 2. Conversion-event: run fraud detection before create; if rules trigger -> hold (customer-scoped).
  if (canManageFraudEvents) {
    let shouldHoldCommission = false;

    if (riskRulesTriggered) {
      shouldHoldCommission = true;
    } else {
      const hasPendingRiskGroups = await prisma.fraudEventGroup.findFirst({
        where: {
          programId,
          partnerId,
          status: FraudEventStatus.pending,
          type: {
            in: PARTNER_LEVEL_FRAUD_RULES,
          },
        },
        select: {
          id: true,
        },
      });

      shouldHoldCommission = hasPendingRiskGroups !== null;
    }

    // An explicit `status` input (e.g. imports) wins; clawbacks (earnings <= 0) are never held.
    if (
      shouldHoldCommission &&
      !status &&
      commission.earnings > 0 &&
      commission.status === CommissionStatus.pending
    ) {
      const commissionBeforeHold = pick(commission, [
        "id",
        "amount",
        "earnings",
        "status",
      ]);

      try {
        commission = await prisma.commission.update({
          where: {
            id: commission.id,
            status: CommissionStatus.pending,
          },
          data: {
            status: CommissionStatus.hold,
          },
          include: commissionInclude,
        });

        await trackCommissionStatusUpdate({
          workspaceId: workspace.id,
          programId,
          commissions: [commissionBeforeHold],
          newStatus: CommissionStatus.hold,
        });
      } catch (error) {
        // The update only matches pending commissions; if it fails (e.g. concurrent status change),
        // re-fetch so side effects use the current status from the database.

        commission = await prisma.commission.findUniqueOrThrow({
          where: {
            id: commission.id,
          },
          include: commissionInclude,
        });
      }
    }
  }

  const isOnHold = commission.status === CommissionStatus.hold;
  const shouldTriggerWorkflow = !isClawback && !skipWorkflow && !isOnHold;

  const webhookPartner = constructWebhookPartner(programEnrollment, {
    totalCommissions:
      toCentsNumber(programEnrollment.totalCommissions) + commission.earnings,
  });

  const results = await Promise.allSettled([
    sendWorkspaceWebhook({
      workspace,
      trigger: "commission.created",
      data: CommissionWebhookSchema.parse({
        ...commission,
        partner: webhookPartner,
      }),
    }),

    sendPartnerPostback({
      partnerId,
      event: "commission.created",
      data: commission,
    }),

    !isOnHold &&
      syncTotalCommissions({
        partnerId,
        programId,
      }),

    !isClawback &&
      notifyPartnerCommission({
        program,
        // fallback to default group if no partner group is found
        group: programEnrollment.partnerGroup ?? program.groups[0],
        workspace,
        commission,
        isFirstCommission,
      }),

    // Execute Dub workflows
    shouldTriggerWorkflow &&
      executeWorkflows({
        trigger: "partnerMetricsUpdated",
        reason: "commission",
        identity: {
          workspaceId: workspace.id,
          programId,
          partnerId,
        },
        metrics: {
          current: {
            commissions: commission.earnings,
          },
        },
      }),

    // Aggregate due commissions immediately for manual commission
    triggerAggregateDueCommissions &&
      triggerAggregateDueCommissionsCronJob(programId),
  ]);

  return [
    "sendWorkspaceWebhook",
    "sendPartnerPostback",
    "syncTotalCommissions",
    "notifyPartnerCommission",
    "executeWorkflows",
    "triggerAggregateDueCommissions",
  ].map((step, index) => ({
    step,
    result: results[index],
  }));
}

// Reward cap scope:
// - Sales: partner and customer level
// - Clicks & Leads: partner level only
async function clampEarningsToSpendLimit({
  reward,
  earnings,
  programId,
  partnerId,
  customerId,
  referenceDate,
}: {
  reward: Pick<
    RewardProps,
    "event" | "spendLimitAmount" | "spendLimitInterval"
  >;
  earnings: number;
  programId: string;
  partnerId: string;
  customerId: string;
  referenceDate: Date; // When creating a manual commission, the reference date is the createdAt date
}) {
  if (
    earnings === 0 ||
    !reward.spendLimitAmount ||
    !reward.spendLimitInterval
  ) {
    return earnings;
  }

  const { startDate, endDate } = getRewardSpendLimitWindow({
    spendLimitInterval: reward.spendLimitInterval,
    referenceDate,
  });

  // Find the commission earnings for the partner and customer (if applicable) for the spend limit window
  const {
    _sum: { earnings: totalEarnings },
  } = await prisma.commission.aggregate({
    where: {
      programId,
      partnerId,
      ...(reward.event === "sale" ? { customerId } : {}),
      type: reward.event,
      status: {
        in: ["pending", "processed", "paid", "hold"],
      },
      // only need to filter if not all-time spend limit (no startDate or endDate)
      ...(startDate && endDate
        ? {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          }
        : {}),
    },
    _sum: {
      earnings: true,
    },
  });

  return Math.max(
    0,
    Math.min(earnings, reward.spendLimitAmount - (totalEarnings ?? 0)),
  );
}
