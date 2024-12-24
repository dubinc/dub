import { Program } from "@dub/prisma/client";

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

  if (program.commissionType === "percentage") {
    return saleAmount * (program.commissionAmount / 100);
  }

  if (program.commissionType === "flat") {
    return sales * program.commissionAmount;
  }

  throw new Error("Invalid commissionType");
};
