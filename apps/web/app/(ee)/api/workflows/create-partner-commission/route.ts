import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { createId } from "@/lib/api/create-id";
import { detectAndRecordFraudEvent } from "@/lib/api/fraud/detect-record-fraud-event";
import { notifyPartnerCommission } from "@/lib/api/partners/notify-partner-commission";
import { syncTotalCommissions } from "@/lib/api/partners/sync-total-commissions";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { calculateSaleEarnings } from "@/lib/api/sales/calculate-sale-earnings";
import { executeWorkflows } from "@/lib/api/workflows/execute-workflows";
import { logger } from "@/lib/axiom/server";
import { getWorkflowConfig } from "@/lib/cron/qstash-workflow";
import { constructWebhookPartner } from "@/lib/partners/constuct-webhook-partner";
import { determinePartnerReward } from "@/lib/partners/determine-partner-reward";
import { getRewardAmount } from "@/lib/partners/get-reward-amount";
import { sendPartnerPostback } from "@/lib/postback/send-partner-postback";
import { RewardProps } from "@/lib/types";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import {
  CommissionWebhookSchema,
  createPartnerCommissionSchema,
} from "@/lib/zod/schemas/commissions";
import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import { prisma } from "@dub/prisma";
import {
  Commission,
  CommissionStatus,
  Link,
  Partner,
  PartnerGroup,
  ProgramEnrollment,
  Reward,
} from "@dub/prisma/client";
import {
  currencyFormatter,
  log,
  pick,
  prettyPrint,
  toCentsNumber,
} from "@dub/utils";
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
        ...(event === "click" && { clickReward: true }),
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

    if (commission) {
      // Step 2: Link the commission to the bounty submission
      if (bountySubmissionId) {
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

      // Step 3: Run side effects
      await context.run("run-side-effects", async () => {
        return await stepRunSideEffects({
          ...input,
          programEnrollment,
          isFirstCommission,
          commission,
        });
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
    userId,
    context,
    programEnrollment,
  } = input;

  if (typeof amount !== "number") {
    amount = 0;
  }

  let earnings = 0;
  let reward: RewardProps | null = null;
  let status: CommissionStatus = "pending";
  let firstCommission: Pick<
    Commission,
    "rewardId" | "status" | "createdAt"
  > | null = null;

  if (event === "custom") {
    earnings = amount;
    amount = 0;
  } else {
    if (["lead", "sale"].includes(event) && customerId) {
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

    reward = determinePartnerReward({
      event,
      programEnrollment,
      ...(context ? { context } : {}),
    });

    // if there is no reward, skip commission creation
    if (!reward) {
      return logAndReturn({
        commission: null,
        outputLog: `Partner ${partnerId} has no reward for ${event} event, skipping commission creation...`,
      });
    }

    // for click events, it's super simple – just multiply the reward amount by the quantity
    if (event === "click") {
      earnings = getRewardAmount(reward) * quantity;

      // for lead and sale events, we need to check if this partner-customer combination was recorded already (for deduplication)
      // for sale rewards specifically, we also need to check:
      // 1. if the partner has reached the max duration for the reward (if applicable)
      // 2. if the previous commission were marked as fraud or canceled
    } else {
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
        // for sale events, we need to calculate the earnings based on the sale amount
      } else {
        earnings = calculateSaleEarnings({
          reward,
          sale: {
            quantity,
            amount,
          },
        });
      }
    }
  }

  // skip commission creation if the earnings is zero
  if (earnings === 0) {
    return logAndReturn({
      commission: null,
      outputLog: `Partner ${partnerId} has zero earnings for ${event} event, skipping commission creation...`,
    });
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
        ...(createdAt && { createdAt }), // TODO: Check this
      },
    });

    console.log(prettyPrint(commission));

    const isFirstCommission =
      event !== "custom" ? firstCommission === null : undefined;

    return logAndReturn({
      commission: {
        id: commission.id,
      },
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
  input: StepFunctionInput & { commission: Pick<Commission, "id"> },
) {
  const {
    commission: _commission,
    programEnrollment,
    isFirstCommission,
    programId,
    partnerId,
    userId,
    linkId,
    eventId,
    skipWorkflow,
    clickEvent,
  } = input;

  const commission = await prisma.commission.findUnique({
    where: {
      id: _commission.id,
    },
    include: {
      customer: true,
      link: true,
    },
  });

  if (!commission) {
    return logAndReturn({
      commission: null,
      outputLog: `Commission ${_commission.id} not found, skipping side effects...`,
    });
  }

  const webhookPartner = constructWebhookPartner(programEnrollment, {
    totalCommissions:
      toCentsNumber(programEnrollment.totalCommissions) + commission.earnings,
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
  const { customer } = commission;

  const isClawback = commission.earnings < 0;
  const shouldTriggerWorkflow = !isClawback && !skipWorkflow;
  const shouldRunFraudDetection = customer && eventId && clickEvent;

  await Promise.allSettled([
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
      data: {
        ...commission,
        customer: commission.customer,
      },
    }),

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
  ]);

  const user = userId
    ? await prisma.user.findUnique({
        where: {
          id: userId,
        },
      })
    : null;

  await Promise.allSettled([
    // We only capture audit logs for manual commissions
    user &&
      recordAuditLog({
        workspaceId: workspace.id,
        programId,
        action: isClawback ? "clawback.created" : "commission.created",
        description: isClawback
          ? `Clawback created for ${partnerId}`
          : `Commission created for ${partnerId}`,
        actor: user,
        targets: [
          {
            type: isClawback ? "clawback" : "commission",
            id: commission.id,
            metadata: commission,
          },
        ],
      }),

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

    // Only run this for non-manual commissions
    shouldRunFraudDetection &&
      detectAndRecordFraudEvent({
        program: { id: programId },
        partner: pick(webhookPartner, ["id", "email", "name"]),
        programEnrollment: pick(programEnrollment, ["status"]),
        customer: {
          ...pick(customer, ["id", "email", "name"]),
          isFirstConversion: true, // fix it
        },
        link: { id: linkId },
        click: pick(clickEvent, ["url", "referer"]),
        event: { id: eventId },
      }),
  ]);
}
