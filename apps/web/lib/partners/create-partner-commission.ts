import { prisma } from "@dub/prisma";
import { EventType } from "@dub/prisma/client";
import { createId } from "../api/create-id";
import { calculateSaleEarnings } from "../api/sales/calculate-sale-earnings";
import { determinePartnerReward } from "./determine-partner-reward";
import { validatePartnerRewardAmount } from "./partner-reached-max-reward";

export const createPartnerCommission = async ({
  type,
  programId,
  partnerId,
  linkId,
  customerId,
  eventId,
  invoiceId,
  amount,
  quantity,
  currency,
}: {
  type: EventType;
  partnerId: string;
  programId: string;
  linkId: string;
  customerId?: string;
  eventId?: string;
  invoiceId?: string | null;
  amount: number;
  quantity: number;
  currency?: string;
}) => {
  const reward = await determinePartnerReward({
    event: type,
    programId,
    partnerId,
  });

  if (!reward) {
    return;
  }

  const earnings =
    type !== "sale"
      ? reward.amount * quantity
      : calculateSaleEarnings({
          reward,
          sale: {
            quantity,
            amount,
          },
        });

  const { allowedEarnings } = await validatePartnerRewardAmount({
    event: type,
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
      type,
      currency,
      earnings: allowedEarnings,
    },
  });

  console.log(commission);

  return commission;
};
