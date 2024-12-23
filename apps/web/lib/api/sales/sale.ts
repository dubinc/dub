import { Prisma, Program, SaleStatus } from "@dub/prisma/client";
import { createId } from "../utils";
import { calculateEarnings } from "./commission";

export const createSaleData = ({
  customerId,
  linkId,
  clickId,
  invoiceId,
  eventId,
  paymentProcessor,
  amount,
  currency,
  partnerId,
  program,
  metadata,
}: {
  customerId: string;
  linkId: string;
  clickId: string;
  invoiceId: string | null;
  eventId: string;
  paymentProcessor: string;
  amount: number;
  currency: string;
  partnerId: string;
  program: Program;
  metadata: Record<string, any>;
}) => {
  const earnings = calculateEarnings({
    program,
    sales: 1,
    saleAmount: amount,
  });

  return {
    id: createId({ prefix: "sale_" }),
    customerId,
    linkId,
    clickId,
    invoiceId,
    eventId,
    paymentProcessor,
    amount,
    earnings,
    currency,
    partnerId,
    programId: program.id,
    metadata: metadata || Prisma.JsonNull,
    status: SaleStatus.pending,
  };
};
