import { DiscountProps } from "@/lib/types";
import { currencyFormatter } from "@dub/utils";

export const constructDiscountAmount = (
  discount: Pick<DiscountProps, "amount" | "type">,
) => {
  return discount.type === "percentage"
    ? `${discount.amount}%`
    : currencyFormatter(discount.amount / 100, {
        trailingZeroDisplay: "stripIfInteger",
      });
};
