import { DiscountCode } from "@prisma/client";

// Soft-deleted discount codes keep their row with isDeleted set.
export function isDiscountCodeSoftDeleted(
  discountCode: Pick<DiscountCode, "isDeleted">,
): boolean {
  return discountCode.isDeleted;
}

export function isDiscountCodeDisabled(
  discountCode: Pick<DiscountCode, "disabledAt">,
): boolean {
  return discountCode.disabledAt != null;
}
