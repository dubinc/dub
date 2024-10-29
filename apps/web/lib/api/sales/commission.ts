import { Program, Sale } from "@prisma/client";

// Calculate the commission earned for a sale
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
    return sale.amount * (program.commissionAmount / 100);
  }

  if (program.commissionType === "flat") {
    return program.commissionAmount;
  }

  throw new Error("Invalid commissionType.");
};

// Calculate the recurring commission earned for a sale
export const calculateRecurringCommissionEarned = ({
  program,
  sale,
}: {
  program: Pick<Program, "commissionAmount" | "commissionType">;
  sale: Pick<Sale, "amount">;
}) => {
  //
};
