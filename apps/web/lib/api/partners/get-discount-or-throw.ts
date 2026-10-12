import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { DubApiError } from "../errors";

export async function getDiscountOrThrow<
  T extends Prisma.DiscountInclude = {},
>({
  discountId,
  programId,
  include,
}: {
  discountId: string;
  programId: string;
  include?: T;
}): Promise<Prisma.DiscountGetPayload<{ include: T }>> {
  const discount = await prisma.discount.findUnique({
    where: {
      id: discountId,
    },
    include,
  });

  if (!discount) {
    throw new DubApiError({
      code: "not_found",
      message: "Discount not found.",
    });
  }

  if (discount.programId !== programId) {
    throw new DubApiError({
      code: "not_found",
      message: "Discount does not belong to this program.",
    });
  }

  return discount as Prisma.DiscountGetPayload<{ include: T }>;
}
