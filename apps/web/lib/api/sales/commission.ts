import { Program, Sale } from "@prisma/client";

export const calculateCommissionEarned = ({
  program,
  sale,
}: {
  program: Pick<Program, "commissionAmount" | "commissionType">;
  sale: Pick<Sale, "amount">;
}) => {
  if (program.commissionAmount === 0) {
    return 0;
  }

  if (program.commissionType === "percentage") {
    return (sale.amount * program.commissionAmount) / 100;
  }

  if (program.commissionType === "fixed") {
    return program.commissionAmount;
  }

  throw new Error("Invalid commissionType.");
};
