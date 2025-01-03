import { Prisma, Program, SaleStatus } from "@dub/prisma/client";
import { createId } from "../utils";
import { calculateEarnings } from "./calculate-earnings";

export const createSaleData = ({
  program,
  partner,
  customer,
  sale,
  metadata,
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
  metadata: Record<string, any>;
}) => {
  const earnings = calculateEarnings({
    program,
    partner,
    sales: 1,
    saleAmount: sale.amount,
  });

  return {
    id: createId({ prefix: "sale_" }),
    customerId: customer.id,
    linkId: customer.linkId,
    clickId: customer.clickId,
    invoiceId: sale.invoiceId,
    eventId: sale.eventId,
    paymentProcessor: sale.paymentProcessor,
    amount: sale.amount,
    earnings,
    currency: sale.currency,
    partnerId: partner.id,
    programId: program.id,
    status: SaleStatus.pending,
    metadata: metadata || Prisma.JsonNull,
  };
};
