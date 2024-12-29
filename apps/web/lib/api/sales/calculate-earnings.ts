import { Program, ProgramEnrollment } from "@dub/prisma/client";

/* 
  Calculate the commission earned for a sale
*/
export const calculateEarnings = ({
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
