import { prisma } from "@dub/prisma";
import {
  Commission,
  CommissionType,
  Partner,
  Payout,
  Prisma,
} from "@dub/prisma/client";
import {
  currencyFormatter,
  log,
  nanoid,
  NETWORK_PROGRAM_ID,
  NETWORK_WORKSPACE_ID,
} from "@dub/utils";
import { differenceInMonths } from "date-fns";
import { isFirstConversion } from "../analytics/is-first-conversion";
import { createId } from "../api/create-id";
import { syncPartnerLinksStats } from "../api/partners/sync-partner-links-stats";
import { calculateSaleEarnings } from "../api/sales/calculate-sale-earnings";
import { determinePartnerReward } from "../partners/determine-partner-reward";
import { getLeadEvent, recordSale } from "../tinybird";
import { LeadEventTB } from "../types";
import { NETWORK_REFERRAL_REWARD } from "./constants";

type CreateNetworkReferralCommissionProps = {
  partner: Pick<Partner, "id" | "referredByPartnerId">;
  payout: Pick<Payout, "id" | "amount" | "programId">;
};

export const createNetworkReferralCommission = async ({
  partner,
  payout,
}: CreateNetworkReferralCommissionProps) => {
  if (!partner.referredByPartnerId) {
    console.error(
      `Partner ${partner.id} has no referredByPartnerId, skipping...`,
    );
    return null;
  }

  if (payout.programId === NETWORK_PROGRAM_ID) {
    console.error(`Payout ${payout.id} is from Network program, skipping...`);
    return null;
  }

  const payoutFeeEarned = Math.floor(payout.amount * 0.03); // assumes 3% average payout fee for all payouts

  const programEnrollment = await prisma.programEnrollment.findUnique({
    where: {
      partnerId_programId: {
        partnerId: partner.referredByPartnerId,
        programId: NETWORK_PROGRAM_ID,
      },
    },
    include: {
      partner: true,
      links: true,
      saleReward: true,
    },
  });

  if (!programEnrollment) {
    console.log(
      `Referrer partner ${partner.referredByPartnerId} is not enrolled in network program.`,
    );
    return null;
  }

  const customer = await prisma.customer.findUnique({
    where: {
      projectId_externalId: {
        projectId: NETWORK_WORKSPACE_ID,
        externalId: partner.id,
      },
    },
    include: {
      link: true,
    },
  });

  const invoiceId = `referral:network:${payout.id}`;

  if (customer?.link) {
    const leadEventData = (await getLeadEvent({
      customerId: customer.id,
    })) as LeadEventTB | null;

    if (leadEventData) {
      const saleData = {
        ...leadEventData,
        event_id: nanoid(16),
        event_name: "Partner payout fee",
        customer_id: customer.id,
        payment_processor: "dub",
        amount: payoutFeeEarned,
        currency: "usd",
        invoice_id: invoiceId,
      };

      const firstConversionFlag = isFirstConversion({
        customer,
        linkId: saleData.link_id,
      });

      await Promise.allSettled([
        recordSale({
          ...saleData,
          timestamp: undefined,
        }),

        // Update link conversions, sales, and saleAmount
        prisma.link.update({
          where: {
            id: saleData.link_id,
          },
          data: {
            ...(firstConversionFlag && {
              conversions: {
                increment: 1,
              },
              lastConversionAt: new Date(),
            }),
            sales: {
              increment: 1,
            },
            saleAmount: {
              increment: payoutFeeEarned,
            },
          },
        }),

        prisma.customer.update({
          where: {
            id: customer.id,
          },
          data: {
            sales: {
              increment: 1,
            },
            saleAmount: {
              increment: payoutFeeEarned,
            },
            firstSaleAt: customer.firstSaleAt ? undefined : new Date(),
          },
        }),
      ]);
      await syncPartnerLinksStats({
        partnerId: partner.referredByPartnerId,
        programId: NETWORK_PROGRAM_ID,
        eventType: "sale",
      });
    } else {
      // should never happen, but just in case
      console.error(`No lead event data found for customer ${customer.id}.`);
    }
  } else {
    // should never happen, but just in case
    console.error(`No customer found for partner ${partner.id}.`);
  }

  const reward = determinePartnerReward({
    event: "sale",
    programEnrollment,
  });

  if (!reward) {
    console.log(
      `Referrer partner ${partner.referredByPartnerId} has no eligible reward for the network program.`,
    );
    return null;
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
      return null;
    }
  }

  const earnings = calculateSaleEarnings({
    reward,
    sale: {
      amount: payoutFeeEarned,
      quantity: 1,
    },
  });

  const commissionData: Prisma.CommissionUncheckedCreateInput = {
    id: createId({ prefix: "cm_" }),
    programId: NETWORK_PROGRAM_ID,
    partnerId: partner.referredByPartnerId,
    sourcePartnerId: partner.id,
    type: CommissionType.referral,
    amount: 0,
    quantity: 1,
    earnings,
    customerId: customer?.id,
    linkId: customer?.link?.id,
    invoiceId,
    description: `Earned ${reward.amountInPercentage}% commission on the referred partner's ${currencyFormatter(payoutFeeEarned)} payout fee.`,
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
    if (error.code === "P2002") {
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
