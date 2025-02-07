import { CommissionStatus, EventType, Program } from "@dub/prisma/client";
import { createId } from "../utils";
import { calculateSaleEarnings } from "./calculate-earnings";

export const createSaleData = ({
  program,
  partner,
  customer,
  sale,
}: {
  program: Program;
  partner: {
    id: string;
    commissionAmount: number | null;
  };
  customer: {
    id: string;
    linkId: string;
    clickId: string;
  };
  sale: {
    amount: number;
    currency: string;
    invoiceId: string | null;
    eventId: string;
    paymentProcessor: string;
  };
}) => {
  const earnings = calculateSaleEarnings({
    program,
    partner,
    sales: 1,
    saleAmount: sale.amount,
  });

  return {
    id: createId({ prefix: "cm_" }),
    type: EventType.sale,
    quantity: 1,
    customerId: customer.id,
    linkId: customer.linkId,
    clickId: customer.clickId,
    invoiceId: sale.invoiceId,
    eventId: sale.eventId,
    paymentProcessor: sale.paymentProcessor,
    amount: sale.amount,
    currency: sale.currency,
    partnerId: partner.id,
    programId: program.id,
    status: CommissionStatus.pending,
    earnings,
  };
};
