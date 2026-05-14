import { prisma } from "@dub/prisma";
import {
  Commission,
  CommissionType,
  Partner,
  Payout,
  Prisma,
} from "@dub/prisma/client";
import { log, NETWORK_PROGRAM_ID } from "@dub/utils";
import { differenceInMonths } from "date-fns";
import { createId } from "../api/create-id";
import { NETWORK_REFERRAL_REWARD } from "./constants";

type CreateNetworkReferralCommissionProps = {
  payout: Pick<Payout, "id" | "amount" | "programId">;
  partner: Pick<Partner, "id" | "referredByPartnerId">;
};

export const createNetworkReferralCommission = async ({
  payout,
  partner,
}: CreateNetworkReferralCommissionProps) => {
  if (!partner.referredByPartnerId) {
    console.error(`Partner ${partner.id} has no referredByPartnerId.`);
    return;
  }

  if (payout.programId === NETWORK_PROGRAM_ID) {
    return;
  }

  const programEnrollment = await prisma.programEnrollment.findUnique({
    where: {
      partnerId_programId: {
        partnerId: partner.referredByPartnerId,
        programId: NETWORK_PROGRAM_ID,
      },
    },
    select: {
      id: true,
    },
  });

  if (!programEnrollment) {
    console.log(
      `Referrer partner ${partner.referredByPartnerId} is not enrolled in network program.`,
    );
    return;
  }

  const firstCommission = await prisma.commission.findFirst({
    where: {
      programId: NETWORK_PROGRAM_ID,
      partnerId: partner.referredByPartnerId,
      sourcePartnerId: partner.id,
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      createdAt: true,
    },
  });

  if (firstCommission) {
    const durationMonths = differenceInMonths(
      new Date(),
      firstCommission.createdAt,
    );

    if (durationMonths >= NETWORK_REFERRAL_REWARD.maxDuration) {
      console.log(
        `Referrer partner ${partner.referredByPartnerId} has reached max duration for network bonus.`,
      );
      return;
    }
  }

  const earnings = Math.round(
    NETWORK_REFERRAL_REWARD.amountInPercentage * 0.01 * payout.amount,
  );

  const commissionData: Prisma.CommissionUncheckedCreateInput = {
    id: createId({ prefix: "cm_" }),
    programId: NETWORK_PROGRAM_ID,
    partnerId: partner.referredByPartnerId,
    sourcePartnerId: partner.id,
    type: CommissionType.referral,
    amount: 0,
    quantity: 1,
    earnings,
    invoiceId: `referral:network:${payout.id}`,
  };

  let commission: Commission | null = null;

  try {
    commission = await prisma.commission.create({
      data: commissionData,
    });

    console.log("Network referral commission created", commission);
  } catch (error) {
    // Don't retry on unique constraint violation – the commission already exists
    // (likely a race between the dedup check and the create)
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      console.log(
        `Referral commission already exists for invoiceId ${commissionData.invoiceId}, skipping creation.`,
      );
      return null;
    }

    console.error(
      "Error creating network referral commission",
      error,
      commissionData,
    );

    await log({
      message: `[createNetworkReferralCommission] Error creating referral commission - ${error.message}`,
      type: "errors",
      mention: true,
    });

    throw error;
  }

  return commission;
};
