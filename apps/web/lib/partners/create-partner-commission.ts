import { prisma } from "@dub/prisma";
import {
  CommissionStatus,
  CommissionType,
  EventType,
  Link,
  Partner,
  ProgramEnrollment,
  WorkflowTrigger,
} from "@dub/prisma/client";
import { currencyFormatter, log, prettyPrint } from "@dub/utils";
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
import { DEFAULT_PARTNER_GROUP } from "../zod/schemas/groups";
import { aggregatePartnerLinksStats } from "./aggregate-partner-links-stats";
import { determinePartnerReward } from "./determine-partner-reward";
import { getRewardAmount } from "./get-reward-amount";

export type CreatePartnerCommissionProps = {
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
};

const constructWebhookPartner = (
  programEnrollment: ProgramEnrollment & { partner: Partner; links: Link[] },
  { totalCommissions }: { totalCommissions: number } = { totalCommissions: 0 },
) => {
  return {
    ...programEnrollment.partner,
    groupId: programEnrollment.groupId,
    ...aggregatePartnerLinksStats(programEnrollment.links),
    totalCommissions: totalCommissions || programEnrollment.totalCommissions,
  };
};

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
}: CreatePartnerCommissionProps) => {
  let earnings = 0;
  let reward: RewardProps | null = null;
  let status: CommissionStatus = "pending";

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

  if (event === "custom") {
    earnings = amount;
    amount = 0;
  } else {
    reward = determinePartnerReward({
      event: event as EventType,
      programEnrollment,
      context,
    });

    // if there is no reward, skip commission creation
    if (!reward) {
      console.log(
        `Partner ${partnerId} has no reward for ${event} event, skipping commission creation...`,
      );
      return {
        commission: null,
        programEnrollment,
        webhookPartner: constructWebhookPartner(programEnrollment),
      };
    }

    // for click events, it's super simple – just multiply the reward amount by the quantity
    if (event === "click") {
      earnings = getRewardAmount(reward) * quantity;

      // for lead and sale events, we need to check if this partner-customer combination was recorded already (for deduplication)
      // for sale rewards specifically, we also need to check:
      // 1. if the partner has reached the max duration for the reward (if applicable)
      // 2. if the previous commission were marked as fraud or canceled
    } else {
      const firstCommission = await prisma.commission.findFirst({
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

      if (firstCommission) {
        // if first commission is fraud or canceled, skip commission creation
        if (["fraud", "canceled"].includes(firstCommission.status)) {
          console.log(
            `Partner ${partnerId} has a first commission that is ${firstCommission.status}, skipping commission creation...`,
          );
          return {
            commission: null,
            programEnrollment,
            webhookPartner: constructWebhookPartner(programEnrollment),
          };
        }

        // for lead events, we need to check if the partner has already been issued a lead reward for this customer
        if (event === "lead") {
          console.log(
            `Partner ${partnerId} has already been issued a lead reward for this customer ${customerId}, skipping commission creation...`,
          );

          return {
            commission: null,
            programEnrollment,
            webhookPartner: constructWebhookPartner(programEnrollment),
          };

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
              console.log(
                `Partner ${partnerId} is only eligible for first-sale commissions based on the original reward ${originalReward.id}, skipping commission creation...`,
              );
              return {
                commission: null,
                programEnrollment,
                webhookPartner: constructWebhookPartner(programEnrollment),
              };
            }
          }

          // for sale rewards with a max duration, we need to check if the first commission is within the max duration
          // if it's beyond the max duration, we should not create a new commission
          if (typeof reward?.maxDuration === "number") {
            // One-time sale reward (maxDuration === 0)
            if (reward.maxDuration === 0) {
              console.log(
                `Partner ${partnerId} is only eligible for first-sale commissions, skipping commission creation...`,
              );
              return {
                commission: null,
                programEnrollment,
                webhookPartner: constructWebhookPartner(programEnrollment),
              };
            }

            // Recurring sale reward (maxDuration > 0)
            else {
              const monthsDifference = differenceInMonths(
                new Date(),
                firstCommission.createdAt,
              );

              if (monthsDifference >= reward.maxDuration) {
                console.log(
                  `Partner ${partnerId} has reached max duration for ${event} event, skipping commission creation...`,
                );
                return {
                  commission: null,
                  programEnrollment,
                  webhookPartner: constructWebhookPartner(programEnrollment),
                };
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
          sale: { quantity, amount },
        });
      }
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
        eventId: eventId || null, // empty string should convert to null
        invoiceId: invoiceId || null, // empty string should convert to null
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
      `Created a ${event} commission ${commission.id} (${currencyFormatter(commission.earnings, { currency: commission.currency })}) for ${partnerId}: ${prettyPrint(commission)}`,
    );

    const webhookPartner = constructWebhookPartner(programEnrollment, {
      // check links metrics
      totalCommissions:
        programEnrollment.totalCommissions + commission.earnings,
    });

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

        const isClawback = earnings < 0;
        const shouldTriggerWorkflow = !isClawback && !skipWorkflow;

        await Promise.allSettled([
          sendWorkspaceWebhook({
            workspace,
            trigger: "commission.created",
            data: CommissionWebhookSchema.parse({
              ...commission,
              partner: webhookPartner,
            }),
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
              context: {
                programId,
                partnerId,
                current: {
                  commissions: commission.earnings,
                },
              },
            }),
        ]);
      })(),
    );

    return {
      commission,
      programEnrollment,
      webhookPartner,
    };
  } catch (error) {
    console.error("Error creating commission", error);

    await log({
      message: `Error creating commission - ${error.message}`,
      type: "errors",
      mention: true,
    });

    return {
      commission: null,
      programEnrollment,
      webhookPartner: constructWebhookPartner(programEnrollment),
    };
  }
};
