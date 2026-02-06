import { Discount, Partner } from "@dub/prisma/client";

export function constructDiscountCode({
  partner,
  discount,
}: {
  partner: Pick<Partner, "name">;
  discount: Pick<Discount, "amount" | "type">;
}) {
  const amount = Math.round(
    discount.type === "percentage" ? discount.amount : discount.amount / 100,
  );

  const [firstName] = partner.name.trim().toUpperCase().split(" ");
  const prefix = firstName || "PARTNER";

  // account for edge case where the amount is 0
  return `${prefix}${amount > 0 ? `${amount}OFF` : ""}`;
}
