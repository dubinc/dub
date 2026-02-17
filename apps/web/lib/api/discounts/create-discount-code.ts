import { createId } from "@/lib/api/create-id";
import { createStripeDiscountCode } from "@/lib/stripe/create-stripe-discount-code";
import { prisma } from "@dub/prisma";
import { Discount, Link, Partner } from "@dub/prisma/client";
import { constructDiscountCode } from "./construct-discount-code";

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
  let finalCode = code;

  // Construct the discount code if no code is provided
  if (!finalCode) {
    finalCode = constructDiscountCode({
      partner,
      discount,
    });
  }

  const stripeDiscountCode = await createStripeDiscountCode({
    stripeConnectId,
    discount,
    code: finalCode,
    shouldRetry: code ? false : true,
  });

  const discountCode = await prisma.discountCode.create({
    data: {
      id: createId({ prefix: "dcode_" }),
      code: stripeDiscountCode.code,
      programId: discount.programId,
      partnerId: partner.id,
      linkId: link.id,
      discountId: discount.id,
    },
  });

  console.log(
    `Created discount code ${discountCode.code} for the link ${link.id}.`,
  );

  return discountCode;
}
