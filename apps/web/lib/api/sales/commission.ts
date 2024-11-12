import { Program, Sale } from "@prisma/client";

/* 
  Calculate the commission earned for a sale
*/
export const calculateEarnings = ({
  program,
  sales,
  saleAmount,
}: {
  program: Pick<Program, "commissionAmount" | "commissionType">;
  sales: number;
  saleAmount: number;
}) => {
  if (program.commissionAmount === 0) {
    return 0;
  }

  return (
    (program.commissionType === "percentage" ? saleAmount : sales) *
    (program.commissionAmount / 100) // commission amount is either a percentage of amount in cents
  );
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
