import { Program, Sale, SaleStatus } from "@prisma/client";

import { ProgramEnrollment } from "@prisma/client";
import { createId } from "../utils";
import { calculateCommissionEarned } from "./commission";

export const createSaleData = ({
  customerId,
  linkId,
  clickId,
  invoiceId,
  eventId,
  eventName,
  paymentProcessor,
  amount,
  currency,
  programEnrollment,
}: {
  customerId: string;
  linkId: string;
  clickId: string;
  invoiceId: string | null;
  eventId: string;
  eventName: string;
  paymentProcessor: string;
  amount: number;
  currency: string;
  programEnrollment: ProgramEnrollment & { program: Program };
}): Omit<Sale, "createdAt" | "updatedAt" | "payoutId"> => {
  const { program, partnerId } = programEnrollment;

  const commissionEarned = calculateCommissionEarned({
    program,
    sale: { amount },
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
    id: createId({ prefix: "" }),
    customerId,
    linkId,
    clickId,
    invoiceId,
    eventId,
    eventName,
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
    commissionEarned,
  };
};
