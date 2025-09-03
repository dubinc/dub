import { DiscountProps } from "@/lib/types";
import { nanoid } from "@dub/utils";

export function constructPromotionCode({
  code,
  discount,
}: {
  code: string;
  discount: Pick<DiscountProps, "amount" | "type">;
}) {
  const amount =
    discount.type === "percentage" ? discount.amount : discount.amount / 100;

  if (!code.endsWith(amount.toString())) {
    return `${code}${amount}`;
  }

  return `${code}${nanoid(4)}`;
}
