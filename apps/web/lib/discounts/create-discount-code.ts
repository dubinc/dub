import { createId } from "@/lib/api/create-id";
import { prisma } from "@dub/prisma";
import { Discount, Link, Partner, Project } from "@dub/prisma/client";
import { constructDiscountCode } from "./construct-discount-code";
import { getDiscountProvider } from "./discount-provider";

interface CreateDiscountCodeArgs {
  workspace: Pick<Project, "id" | "stripeConnectId" | "shopifyStoreId">;
  partner: Pick<Partner, "id" | "name">;
  link: Pick<Link, "id">;
  discount: Discount;
  code?: string;
}

export async function createDiscountCode({
  workspace,
  partner,
  link,
  discount,
  code,
}: CreateDiscountCodeArgs) {
  let finalCode = code;

  // Construct the discount code if no code is provided
  if (!finalCode) {
    finalCode = constructDiscountCode({
      partner,
      discount,
    });
  }

  const discountProvider = getDiscountProvider(discount.provider);

  const discountCode = await discountProvider.createDiscountCode({
    workspace,
    discount,
    code: finalCode,
    shouldRetry: code ? false : true,
  });

  return await prisma.discountCode.create({
    data: {
      id: createId({ prefix: "dcode_" }),
      code: discountCode.code,
      programId: discount.programId,
      partnerId: partner.id,
      linkId: link.id,
      discountId: discount.id,
    },
  });
}
