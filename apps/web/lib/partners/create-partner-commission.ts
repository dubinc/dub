import { prisma } from "@dub/prisma";
import { EventType } from "@dub/prisma/client";
import { log } from "@dub/utils";
import { createId } from "../api/create-id";
import { calculateSaleEarnings } from "../api/sales/calculate-sale-earnings";
import { calculateEligibleEarnings } from "./calculate-eligible-earnings";
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
  try {
    const reward = await determinePartnerReward({
      event,
      programId,
      partnerId,
    });

    if (!reward) {
      return;
    }

    const earnings =
      event !== "sale"
        ? reward.amount * quantity
        : calculateSaleEarnings({
            reward,
            sale: {
              quantity,
              amount,
            },
          });

    const { allowedEarnings } = await calculateEligibleEarnings({
      event,
      partnerId,
      programId,
      maxRewardAmount: reward.maxRewardAmount,
      earnings,
    });

    if (allowedEarnings === 0) {
      return;
    }

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
        earnings: allowedEarnings,
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
  }
};
