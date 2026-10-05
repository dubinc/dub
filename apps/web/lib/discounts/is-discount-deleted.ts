import { Discount } from "@prisma/client";

// Soft-deleted discounts keep their row with programId cleared.
export function isDiscountDeleted(
  discount: Pick<Discount, "programId">,
): boolean {
  return !discount.programId;
}
