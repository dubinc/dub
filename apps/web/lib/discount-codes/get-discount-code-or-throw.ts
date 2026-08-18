import { prisma } from "@/lib/prisma";
import { DubApiError } from "../api/errors";

export async function getDiscountCodeOrThrow({
  discountCodeId,
  programId,
}: {
  discountCodeId: string;
  programId: string;
}) {
  const discountCode = await prisma.discountCode.findUnique({
    where: {
      id: discountCodeId,
    },
    include: {
      discount: {
        select: {
          provider: true,
        },
      },
    },
  });

  if (!discountCode || !discountCode.discount) {
    throw new DubApiError({
      code: "not_found",
      message: `Discount code (${discountCodeId}) not found.`,
    });
  }

  if (discountCode.programId !== programId) {
    throw new DubApiError({
      code: "not_found",
      message: `Discount code (${discountCodeId}) not found.`,
    });
  }

  const { discount, ...rest } = discountCode;

  return {
    ...rest,
    discount,
  };
}
