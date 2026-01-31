import { createId } from "@/lib/api/create-id";
import {
  constructDiscountCodeForPartner,
  createStripeDiscountCode,
} from "@/lib/stripe/create-stripe-discount-code";
import { prisma } from "@dub/prisma";
import { Discount, Link, Partner } from "@dub/prisma/client";

// Provision a discount code for a partner
export async function createDiscountCode({
  stripeConnectId,
  partner,
  link,
  discount,
  code,
}: {
  stripeConnectId: string;
  partner: Pick<Partner, "id" | "name">;
  link: Pick<Link, "id">;
  discount: Pick<Discount, "id" | "programId" | "couponId" | "amount" | "type">;
  code?: string;
}) {
  const discountCode = constructDiscountCodeForPartner({
    partner,
    discount,
  });

  const finalCode = code || discountCode;

  const stripeDiscountCode = await createStripeDiscountCode({
    stripeConnectId,
    discount,
    code: finalCode,
    shouldRetry: code ? false : true,
  });

  return prisma.discountCode.create({
    data: {
      id: createId({ prefix: "dcode_" }),
      code: stripeDiscountCode.code,
      programId: discount.programId,
      partnerId: partner.id,
      linkId: link.id,
      discountId: discount.id,
    },
  });
}
