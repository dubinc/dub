import {
  EventType,
  Prisma,
  Program,
  ProgramEnrollment,
} from "@dub/prisma/client";
import { calculateSaleEarnings } from "../sales/calculate-earnings";

interface CreateEarnings {
  program: Pick<Program, "id" | "commissionAmount" | "commissionType">;
  partner: Pick<ProgramEnrollment, "partnerId" | "commissionAmount">;

  linkId: string;
  customerId?: string;

  event: {
    type: EventType;
    id: string;
  };

  click?: {
    quantity: number;
    amount: number;
  };

  sale?: {
    amount: number;
    currency: string;
    invoiceId: string | null;
  };
}

export const prepareEarnings = ({
  event,
  linkId,
  customerId,
  program,
  partner,
  click,
  sale,
}: CreateEarnings): Prisma.EarningsUncheckedCreateInput => {
  const amount = click?.amount || sale?.amount || 0;
  const invoiceId = sale?.invoiceId;
  const currency = sale?.currency;
  const quantity = ["lead", "sale"].includes(event.type)
    ? 1
    : click?.quantity || 0;

  const earnings = sale
    ? calculateSaleEarnings({
        program,
        partner,
        sales: 1,
        saleAmount: amount || 0,
      })
    : null;

  return {
    eventId: event.id,
    type: event.type,
    linkId,
    programId: program.id,
    partnerId: partner.partnerId,
    quantity,
    amount,
    ...(currency && { currency: currency.toLowerCase() }),
    ...(earnings && { earnings }),
    ...(invoiceId && { invoiceId }),
    ...(customerId && { customerId }),
  };
};
