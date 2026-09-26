import { DiscountCode } from "@prisma/client";

// Soft-deleted discount codes keep their row with deletedAt set.
export function isDiscountCodeSoftDeleted(
  discountCode: Pick<DiscountCode, "deletedAt">,
): boolean {
  return discountCode.deletedAt != null;
}

export function isDiscountCodeDisabled(
  discountCode: Pick<DiscountCode, "disabledAt">,
): boolean {
  return discountCode.disabledAt != null;
}
