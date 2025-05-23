import { prisma } from "@dub/prisma";
import { CommissionStatus, EventType } from "@dub/prisma/client";
import { log } from "@dub/utils";
import { differenceInMonths } from "date-fns";
import { createId } from "../api/create-id";
import { calculateSaleEarnings } from "../api/sales/calculate-sale-earnings";
import { RewardProps } from "../types";
import { determinePartnerReward } from "./determine-partner-reward";

export const createPartnerCommission = async ({
  reward,
  event,
  programId,
  partnerId,
  linkId,
  customerId,
  customerCountry,
  eventId,
  invoiceId,
  amount = 0,
  quantity,
  clickEarnings,
  currency,
  createdAt,
}: {
  // we optionally let the caller pass in a reward to avoid a db call
  // (e.g. in aggregate-clicks route)
  reward?: RewardProps | null;
  event: EventType;
  partnerId: string;
  programId: string;
  linkId: string;
  customerId?: string;
  customerCountry?: string | null;
  eventId?: string;
  invoiceId?: string | null;
  amount?: number;
  quantity: number;
  clickEarnings?: number; // only for clicks rewards
  currency?: string;
  createdAt?: Date;
}) => {
  if (!reward) {
    reward = await determinePartnerReward({
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
  }

  // Apply geo rules if the event is lead
  if (
    event === "lead" &&
    customerCountry &&
    reward.geoRules &&
    reward.geoRules[customerCountry]
  ) {
    const amount = reward.geoRules[customerCountry];

    if (amount === 0) {
      console.log(
        `Partner ${partnerId} has no reward for ${event} event in ${customerCountry}, skipping commission creation...`,
      );
      return null;
    }

    reward = {
      ...reward,
      amount,
    };
  }

  let status: CommissionStatus = "pending";

  if (event === "sale") {
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
      if (typeof reward.maxDuration === "number") {
        // One-time sale reward
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
  }

  let earnings = 0;

  if (event === "click") {
    earnings = clickEarnings || 0;
  } else if (event === "lead") {
    earnings = reward.amount * quantity;
  } else if (event === "sale") {
    earnings = calculateSaleEarnings({
      reward,
      sale: {
        quantity,
        amount,
      },
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

  try {
    return await prisma.commission.create({
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
        createdAt,
      },
    });
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
