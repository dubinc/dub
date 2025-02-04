import {
  EventType,
  Prisma,
  Program,
  ProgramEnrollment,
} from "@dub/prisma/client";
import { calculateEarnings as calculateSaleEarnings } from "../sales/calculate-earnings";

interface CreateEarnings {
  event: EventType;
  eventId?: string;
  linkId: string;
  customerId?: string;
  program: Pick<Program, "id" | "commissionAmount" | "commissionType">;
  partner: Pick<ProgramEnrollment, "id" | "commissionAmount">;

  // record consolidated clicks
  click?: {
    quantity: number;
    amount: number;
  };

  // record a sale
  sale?: {
    amount: number;
    currency: string;
    invoiceId: string | null;
  };
}

export const createEarningsData = ({
  event,
  eventId,
  linkId,
  customerId,
  program,
  partner,
  click,
  sale,
}: CreateEarnings) => {
  const quantity = ["lead", "sale"].includes(event) ? 1 : click?.quantity || 0;
  const amount = click?.amount || sale?.amount;
  const invoiceId = sale?.invoiceId;

  const earnings = sale
    ? calculateSaleEarnings({
        program,
        partner,
        sales: 1,
        saleAmount: amount || 0,
      })
    : null;

  const data: Prisma.EarningsUncheckedCreateInput = {
    eventId,
    type: event,
    linkId,
    programId: program.id,
    partnerId: partner.id,
    quantity,
    ...(amount && { amount }),
    ...(earnings && { earnings }),
    ...(invoiceId && { invoiceId }),
    ...(customerId && { customerId }),
  };

  console.log("Earnings created", data);

  return data;
};
