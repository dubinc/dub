import {
  Commission,
  Program,
  ProgramEnrollment,
  Reward,
} from "@dub/prisma/client";

/* 
  Calculate the commission earned for a sale
*/
export const calculateSaleEarningsOld = ({
  program,
  partner,
  sales,
  saleAmount,
}: {
  program: Pick<Program, "commissionAmount" | "commissionType">;
  partner?: Pick<ProgramEnrollment, "commissionAmount">;
  sales: number;
  saleAmount: number;
}) => {
  const commissionAmount =
    partner && partner.commissionAmount !== null
      ? partner.commissionAmount
      : program.commissionAmount;

  if (!commissionAmount) {
    return 0;
  }

  if (program.commissionType === "percentage") {
    return saleAmount * (commissionAmount / 100);
  }

  if (program.commissionType === "flat") {
    return sales * commissionAmount;
  }

  throw new Error("Invalid commissionType");
};

export const calculateSaleEarnings = ({
  reward,
  sale,
}: {
  reward: Pick<Reward, "amount" | "type">;
  sale: Pick<Commission, "quantity" | "amount">;
}) => {
  if (!reward || !reward.amount) {
    return 0;
  }

  if (reward.type === "percentage") {
    return sale.amount * (reward.amount / 100);
  }

  if (reward.type === "flat") {
    return sale.quantity * reward.amount;
  }

  throw new Error("Invalid reward type");
};
