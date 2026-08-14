import { createId } from "@/lib/api/create-id";
import { DubApiError } from "@/lib/api/errors";
import { prisma } from "@/lib/prisma";
import { Discount, Link, Partner, Prisma, Project } from "@prisma/client";
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
  const finalCode =
    code ||
    constructDiscountCode({
      partner,
      discount,
    });

  const linkWithCode = await prisma.link.findUnique({
    where: { id: link.id },
    select: { discountCode: { select: { code: true } } },
  });

  if (linkWithCode?.discountCode) {
    throw new DubApiError({
      code: "bad_request",
      message: `This link already has a discount code (${linkWithCode.discountCode.code}) assigned.`,
    });
  }

  const discountProvider = getDiscountProvider(discount.provider);

  const externalDiscountCode = await discountProvider.createDiscountCode({
    workspace,
    discount,
    code: finalCode,
    shouldRetry: code ? false : true,
  });

  try {
    return await prisma.discountCode.create({
      data: {
        id: createId({ prefix: "dcode_" }),
        code: externalDiscountCode.code,
        programId: discount.programId,
        partnerId: partner.id,
        linkId: link.id,
        discountId: discount.id,
      },
    });
  } catch (error) {
    try {
      await discountProvider.disableDiscountCode({
        workspace,
        code: externalDiscountCode.code,
      });
    } catch (rollbackError) {
      console.error("Failed to rollback external discount code", {
        code: externalDiscountCode.code,
        rollbackError,
      });
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new DubApiError({
        code: "conflict",
        message:
          "This discount code is already in use, or this link already has a code. Please refresh and try again.",
      });
    }

    throw error;
  }
}
