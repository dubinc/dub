import { prisma } from "@dub/prisma";
import { EventType } from "@dub/prisma/client";
import { log } from "@dub/utils";
import { differenceInMonths } from "date-fns";
import { createId } from "../api/create-id";
import { calculateSaleEarnings } from "../api/sales/calculate-sale-earnings";
import { determinePartnerReward } from "./determine-partner-reward";

export const createPartnerCommission = async ({
  event,
  programId,
  partnerId,
  linkId,
  customerId,
  eventId,
  invoiceId,
  amount = 0,
  quantity,
  currency,
}: {
  event: EventType;
  partnerId: string;
  programId: string;
  linkId: string;
  customerId?: string;
  eventId?: string;
  invoiceId?: string | null;
  amount?: number;
  quantity: number;
  currency?: string;
}) => {
  const reward = await determinePartnerReward({
    event,
    partnerId,
    programId,
  });

  if (!reward) {
    console.log(
      `Partner ${partnerId} has no reward for ${event} event, skipping commission creation...`,
    );
    return;
  }

  // handle rewards with max duration limit
  if (typeof reward.maxDuration === "number") {
    // Get the first commission (earliest sale) for this customer-partner pair
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
      if (reward.maxDuration === 0) {
        console.log(
          `Partner ${partnerId} is only eligible for first-sale commissions, skipping commission creation...`,
        );
        return;
      } else {
        // Calculate months difference between first commission and now
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
  }

  let earnings =
    event === "sale"
      ? calculateSaleEarnings({
          reward,
          sale: {
            quantity,
            amount,
          },
        })
      : reward.amount * quantity;

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
      },
    });

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
