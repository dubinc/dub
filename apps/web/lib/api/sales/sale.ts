import { Prisma, Program, ProgramEnrollment, SaleStatus } from "@prisma/client";
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
  programEnrollment,
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
  programEnrollment: ProgramEnrollment & { program: Program };
  metadata: Record<string, any>;
}) => {
  const { program, partnerId } = programEnrollment;

  const earnings = calculateEarnings({
    program,
    sales: 1,
    saleAmount: amount,
  });

  const {
    id: programId,
    commissionAmount,
    commissionType,
    recurringCommission,
    recurringDuration,
    recurringInterval,
    isLifetimeRecurring,
  } = program;

  return {
    id: createId({ prefix: "sale_" }),
    customerId,
    linkId,
    clickId,
    invoiceId,
    eventId,
    paymentProcessor,
    amount,
    currency,
    partnerId,
    programId,
    commissionAmount,
    commissionType,
    recurringCommission,
    recurringDuration,
    recurringInterval,
    isLifetimeRecurring,
    status: SaleStatus.pending,
    earnings,
    metadata: metadata || Prisma.JsonNull,
  };
};
