import { isDiscountCodeDeleted } from "@/lib/discounts/is-discount-code-deleted";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function getDiscountCode<
  T extends Prisma.DiscountCodeInclude = {},
>({
  idOrCode,
  programId,
  include,
}: {
  idOrCode: string;
  programId: string;
  include?: T;
}): Promise<Prisma.DiscountCodeGetPayload<{ include: T }> | null> {
  const discountCode = idOrCode.startsWith("dcode_")
    ? await prisma.discountCode.findUnique({
        where: {
          id: idOrCode,
        },
        include,
      })
    : await prisma.discountCode.findFirst({
        where: {
          programId,
          code: idOrCode,
          deletedAt: null,
        },
        include,
      });

  if (
    !discountCode ||
    isDiscountCodeDeleted(discountCode) ||
    discountCode.programId !== programId
  ) {
    return null;
  }

  return discountCode as Prisma.DiscountCodeGetPayload<{ include: T }>;
}
