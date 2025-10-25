import { getEvents } from "@/lib/analytics/get-events";
import { createId } from "@/lib/api/create-id";
import { calculateSaleEarnings } from "@/lib/api/sales/calculate-sale-earnings";
import { determinePartnerReward } from "@/lib/partners/determine-partner-reward";
import { getRewardAmount } from "@/lib/partners/get-reward-amount";
import { SaleEvent } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { EventType } from "@dub/prisma/client";
import { getProgramEnrollmentOrThrow } from "../programs/get-program-enrollment-or-throw";
import { syncTotalCommissions } from "./sync-total-commissions";

export const backfillLinkCommissions = async (link: {
  id: string;
  partnerId: string;
  programId: string;
}) => {
  const saleEvents = (await getEvents({
    linkId: link.id,
    event: "sales",
    interval: "all",
    page: 1,
    limit: 5000,
    sortOrder: "desc",
    sortBy: "timestamp",
  })) as SaleEvent[];

  const programEnrollment = await getProgramEnrollmentOrThrow({
    partnerId: link.partnerId,
    programId: link.programId,
    include: {
      program: true,
      partner: true,
      links: true,
      saleReward: true,
    },
  });

  const reward = determinePartnerReward({
    event: "sale",
    programEnrollment,
  });

  const { program } = programEnrollment;

  if (!reward || getRewardAmount(reward) === 0) {
    console.log("No reward.", reward);
    return;
  }

  const data = saleEvents
    // only create commissions for non-zero sales
    .filter((e) => e.sale.amount > 0)
    .map((e) => ({
      id: createId({ prefix: "cm_" }),
      programId: program.id,
      partnerId: link.partnerId!,
      linkId: link.id,
      invoiceId: e.invoice_id || null,
      customerId: e.customer.id,
      eventId: e.eventId,
      amount: e.sale.amount,
      type: EventType.sale,
      quantity: 1,
      currency: "usd",
      createdAt: new Date(e.timestamp),
      earnings: calculateSaleEarnings({
        reward,
        sale: {
          quantity: 1,
          amount: e.sale.amount,
        },
      }),
    }));

  // create commissions
  await prisma.commission.createMany({
    data,
    skipDuplicates: true,
  });

  // sync total commissions for the partner in the program
  await syncTotalCommissions({
    partnerId: link.partnerId,
    programId: link.programId,
  });
};
