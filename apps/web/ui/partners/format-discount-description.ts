import { constructDiscountAmount } from "@/lib/api/sales/construct-discount-amount";
import { DiscountProps } from "@/lib/types";
import { pluralize } from "@dub/utils";

export function formatDiscountDescription(
  discount: Pick<
    DiscountProps,
    "amount" | "type" | "maxDuration" | "description"
  >,
): string {
  if (discount.description) {
    return discount.description;
  }

  const discountAmount = constructDiscountAmount(discount);

  const parts: string[] = [];

  parts.push(`New users get ${discountAmount} off `);

  if (discount.maxDuration === null) {
    parts.push("for their lifetime");
  } else if (discount.maxDuration === 0) {
    parts.push("for their first purchase");
  } else if (discount.maxDuration === 1) {
    parts.push("for their first month");
  } else if (discount.maxDuration && discount.maxDuration > 0) {
    parts.push(
      `for ${discount.maxDuration} ${pluralize("month", discount.maxDuration)}`,
    );
  }

  return parts.join(" ");
}
