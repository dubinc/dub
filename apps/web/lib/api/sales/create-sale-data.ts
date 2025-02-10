import {
  Commission,
  CommissionStatus,
  EventType,
  Program,
} from "@dub/prisma/client";
import { createId } from "../utils";
import { calculateSaleEarningsOld } from "./calculate-earnings";

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
  const earnings = calculateSaleEarningsOld({
    program,
    partner,
    sales: 1,
    saleAmount: sale.amount,
  });

  return {
    id: createId({ prefix: "cm_" }),
    programId: program.id,
    partnerId: partner.id,
    linkId: customer.linkId,
    invoiceId: sale.invoiceId || null,
    customerId: customer.id,
    eventId: sale.eventId,
    type: EventType.sale,
    amount: sale.amount,
    quantity: 1,
    earnings,
    currency: sale.currency,
    status: CommissionStatus.pending,
  } as Commission;
};
