import { isDiscountCodeSoftDeleted } from "@/lib/discounts/is-discount-code-soft-deleted";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

type GetDiscountCodeArgs<T extends Prisma.DiscountCodeInclude = {}> = {
  where: Prisma.DiscountCodeWhereInput;
  include?: T;
};

// Returns a live (not soft-deleted) discount code matching `where`, or null.
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
    },
    include,
  });

  if (!discountCode || isDiscountCodeSoftDeleted(discountCode)) {
    return null;
  }

  return discountCode as Prisma.DiscountCodeGetPayload<{ include: T }>;
}
