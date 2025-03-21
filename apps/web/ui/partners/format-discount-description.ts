import { constructRewardAmount } from "@/lib/api/sales/construct-reward-amount";
import { DiscountProps } from "@/lib/types";
import { pluralize } from "@dub/utils";

export function formatDiscountDescription({
  discount,
}: {
  discount: Pick<DiscountProps, "amount" | "type" | "maxDuration">;
}): string {
  const discountAmount = constructRewardAmount(discount);
  const parts: string[] = [];

  parts.push(`Referred users get ${discountAmount} off `);

  if (discount.maxDuration === null) {
    parts.push("for the their lifetime");
  } else if (discount.maxDuration === 0) {
    parts.push("for their first purchase");
  } else if (discount.maxDuration && discount.maxDuration > 0) {
    parts.push(
      `for ${discount.maxDuration} ${pluralize("month", discount.maxDuration)}`,
    );
  }

  return parts.join(" ");
}
