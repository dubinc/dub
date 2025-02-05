import {
  Customer,
  EventType,
  Link,
  Prisma,
  Program,
  ProgramEnrollment,
} from "@dub/prisma/client";
import { calculateSaleEarnings } from "../sales/calculate-earnings";

interface CreateEarnings {
  link: Pick<Link, "id">;
  customer?: Pick<Customer, "id">;
  program: Pick<Program, "id" | "commissionAmount" | "commissionType">;
  partner: Pick<ProgramEnrollment, "partnerId" | "commissionAmount">;

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
  link,
  customer,
  program,
  partner,
  click,
  sale,
}: CreateEarnings) => {
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

  const data: Prisma.EarningsUncheckedCreateInput = {
    eventId: event.id,
    type: event.type,
    linkId: link.id,
    programId: program.id,
    partnerId: partner.partnerId,
    quantity,
    amount,
    ...(currency && { currency: currency.toLowerCase() }),
    ...(earnings && { earnings }),
    ...(invoiceId && { invoiceId }),
    ...(customer && { customerId: customer.id }),
  };

  console.info("Earnings", data);

  return data;
};
