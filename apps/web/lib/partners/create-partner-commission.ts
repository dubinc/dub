import { prisma } from "@dub/prisma";
import {
  CommissionStatus,
  CommissionType,
  EventType,
  WorkflowTrigger,
} from "@dub/prisma/client";
import { currencyFormatter, log } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { differenceInMonths } from "date-fns";
import { recordAuditLog } from "../api/audit-logs/record-audit-log";
import { createId } from "../api/create-id";
import { notifyPartnerCommission } from "../api/partners/notify-partner-commission";
import { syncTotalCommissions } from "../api/partners/sync-total-commissions";
import { getProgramEnrollmentOrThrow } from "../api/programs/get-program-enrollment-or-throw";
import { calculateSaleEarnings } from "../api/sales/calculate-sale-earnings";
import { executeWorkflows } from "../api/workflows/execute-workflows";
import { Session } from "../auth";
import { RewardContext, RewardProps } from "../types";
import { sendWorkspaceWebhook } from "../webhook/publish";
import { CommissionWebhookSchema } from "../zod/schemas/commissions";
import { aggregatePartnerLinksStats } from "./aggregate-partner-links-stats";
import { determinePartnerReward } from "./determine-partner-reward";

export const createPartnerCommission = async ({
  event,
  partnerId,
  programId,
  linkId,
  customerId,
  eventId,
  invoiceId,
  amount = 0,
  quantity,
  currency,
  description,
  createdAt,
  user,
  context,
  skipWorkflow = false,
}: {
  event: CommissionType;
  partnerId: string;
  programId: string;
  linkId?: string;
  customerId?: string;
  eventId?: string;
  invoiceId?: string | null;
  amount?: number;
  quantity: number;
  currency?: string;
  description?: string | null;
  createdAt?: Date;
  user?: Session["user"]; // user who created the manual commission
  context?: RewardContext;
  skipWorkflow?: boolean;
}) => {
  let earnings = 0;
  let reward: RewardProps | null = null;
  let status: CommissionStatus = "pending";

  const programEnrollment = await getProgramEnrollmentOrThrow({
    partnerId,
    programId,
    ...(event === "click" && { includeClickReward: true }),
    ...(event === "lead" && { includeLeadReward: true }),
    ...(event === "sale" && { includeSaleReward: true }),
    includePartner: true,
  });

  if (event === "custom") {
    earnings = amount;
    amount = 0;
  } else {
    reward = await determinePartnerReward({
      event: event as EventType,
      programEnrollment,
      context,
    });

    // if there is no reward, skip commission creation
    if (!reward) {
      console.log(
        `Partner ${partnerId} has no reward for ${event} event, skipping commission creation...`,
      );
      return;
    }

    // for click/lead events, it's super simple – just multiply the reward amount by the quantity
    if (event === "click" || event === "lead") {
      earnings = reward.amount * quantity;

      // for sale events, we need to check:
      // 1. if the partner has reached the max duration for the reward (if applicable)
      // 2. if the previous commission were marked as fraud or canceled
    } else if (event === "sale") {
      const firstCommission = await prisma.commission.findFirst({
        where: {
          partnerId,
          customerId,
          type: "sale",
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

      if (firstCommission) {
        // if partner's reward was updated and different from the first commission's reward
        // we need to make sure it wasn't changed from one-time to recurring so we don't create a new commission
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
            console.log(
              `Partner ${partnerId} is only eligible for first-sale commissions based on the original reward ${originalReward.id}, skipping commission creation...`,
            );
            return;
          }
        }

        // for reward types with a max duration, we need to check if the first commission is within the max duration
        // if it's beyond the max duration, we should not create a new commission
        if (typeof reward?.maxDuration === "number") {
          // One-time sale reward (maxDuration === 0)
          if (reward.maxDuration === 0) {
            console.log(
              `Partner ${partnerId} is only eligible for first-sale commissions, skipping commission creation...`,
            );
            return;
          }

          // Recurring sale reward
          else {
            const monthsDifference = differenceInMonths(
              new Date(),
              firstCommission.createdAt,
            );

            if (monthsDifference >= reward.maxDuration) {
              console.log(
                `Partner ${partnerId} has reached max duration for ${event} event, skipping commission creation...`,
              );
              return;
            }
          }
        }

        // if first commission is fraud or canceled, the commission will be set to fraud or canceled as well
        if (
          firstCommission.status === "fraud" ||
          firstCommission.status === "canceled"
        ) {
          status = firstCommission.status;
        }
      }

      earnings = calculateSaleEarnings({
        reward,
        sale: { quantity, amount },
      });
    }

    // handle rewards with max reward amount limit
    if (reward.maxAmount) {
      const totalRewards = await prisma.commission.aggregate({
        where: {
          earnings: {
            gt: 0,
          },
          programId,
          partnerId,
          status: {
            in: ["pending", "processed", "paid"],
          },
          type: event,
        },
        _sum: {
          earnings: true,
        },
      });

      const totalEarnings = totalRewards._sum.earnings || 0;
      if (totalEarnings >= reward.maxAmount) {
        console.log(
          `Partner ${partnerId} has reached max reward amount for ${event} event, skipping commission creation...`,
        );
        return;
      }

      const remainingRewardAmount = reward.maxAmount - totalEarnings;
      earnings = Math.max(0, Math.min(earnings, remainingRewardAmount));
    }
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
        eventId,
        invoiceId,
        userId: user?.id,
        quantity,
        amount,
        type: event,
        currency,
        earnings,
        status,
        description,
        createdAt,
      },
      include: {
        customer: true,
      },
    });

    console.log(
      `Created a ${event} commission ${commission.id} (${currencyFormatter(commission.earnings)}) for ${partnerId}: ${JSON.stringify(commission)}`,
    );

    waitUntil(
      (async () => {
        const program = await prisma.program.findUniqueOrThrow({
          where: {
            id: programId,
          },
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            holdingPeriodDays: true,
            workspace: {
              select: {
                id: true,
                slug: true,
                name: true,
                webhookEnabled: true,
              },
            },
          },
        });

        const { workspace } = program;

        const isClawback = earnings < 0;
        const shouldTriggerWorkflow = !isClawback && !skipWorkflow;

        // Make sure totalCommissions is up to date before firing the webhook & executing workflows
        const { totalCommissions } = await syncTotalCommissions({
          partnerId,
          programId,
        });

        await Promise.allSettled([
          sendWorkspaceWebhook({
            workspace,
            trigger: "commission.created",
            data: CommissionWebhookSchema.parse({
              ...commission,
              partner: {
                ...programEnrollment.partner,
                ...aggregatePartnerLinksStats(programEnrollment.links),
                totalCommissions,
              },
            }),
          }),

          !isClawback &&
            notifyPartnerCommission({
              program,
              workspace,
              commission,
            }),

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
              trigger: WorkflowTrigger.commissionEarned,
              programId,
              partnerId,
            }),
        ]);
      })(),
    );

    return commission;
  } catch (error) {
    console.error("Error creating commission", error);

    await log({
      message: `Error creating commission - ${error.message}`,
      type: "errors",
      mention: true,
    });

    return;
  }
};
