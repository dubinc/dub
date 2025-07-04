import { prisma } from "@dub/prisma";
import {
  CommissionStatus,
  CommissionType,
  EventType,
} from "@dub/prisma/client";
import { log } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { differenceInMonths } from "date-fns";
import { recordAuditLog } from "../api/audit-logs/record-audit-log";
import { createId } from "../api/create-id";
import { syncTotalCommissions } from "../api/partners/sync-total-commissions";
import { calculateSaleEarnings } from "../api/sales/calculate-sale-earnings";
import { Session } from "../auth";
import { RewardProps } from "../types";
import { determinePartnerReward } from "./determine-partner-reward";

export const createPartnerCommission = async ({
  reward,
  event,
  partnerId,
  programId,
  workspaceId,
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
}: {
  // we optionally let the caller pass in a reward to avoid a db call
  // (e.g. in aggregate-clicks route)
  reward?: RewardProps | null;
  event: CommissionType;
  partnerId: string;
  programId: string;
  workspaceId?: string;
  linkId?: string;
  customerId?: string;
  eventId?: string;
  invoiceId?: string | null;
  amount?: number;
  quantity: number;
  currency?: string;
  description?: string;
  createdAt?: Date;
  user?: Session["user"]; // user who created the commission
}) => {
  let earnings = 0;
  let status: CommissionStatus = "pending";

  if (event === "custom") {
    earnings = amount;
    amount = 0;
  } else {
    if (!reward) {
      reward = await determinePartnerReward({
        event: event as EventType,
        partnerId,
        programId,
      });
    }

    // if there's still no reward, skip commission creation
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
      });

      if (firstCommission) {
        // for reward types with a max duration, we need to check if the first commission is within the max duration
        // if its beyond the max duration, we should not create a new commission
        if (typeof reward?.maxDuration === "number") {
          // One-time sale reward
          if (reward?.maxDuration === 0) {
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
        customerId,
        linkId,
        eventId,
        invoiceId,
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

    waitUntil(
      (async () => {
        const shouldCaptureAuditLog = user && workspaceId;
        const isClawback = earnings < 0;

        await Promise.allSettled([
          syncTotalCommissions({
            partnerId,
            programId,
          }),

          shouldCaptureAuditLog
            ? recordAuditLog({
                workspaceId,
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
              })
            : Promise.resolve(),
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
