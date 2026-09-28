import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

type GetDiscountCodeArgs<T extends Prisma.DiscountCodeInclude = {}> = {
  where: Prisma.DiscountCodeWhereInput;
  include?: T;
};

// Returns a discount code matching `where`, or null.
// Soft-deleted codes are excluded. Disabled codes are returned for the caller to handle.
export async function getDiscountCode<
  T extends Prisma.DiscountCodeInclude = {},
>({
  where,
  include,
}: GetDiscountCodeArgs<T>): Promise<Prisma.DiscountCodeGetPayload<{
  include: T;
}> | null> {
  const discountCode = await prisma.discountCode.findFirst({
    where: {
      ...where,
      deletedAt: null,
    },
    include,
  });

  if (!discountCode) {
    return null;
  }

  return discountCode as Prisma.DiscountCodeGetPayload<{ include: T }>;
}
