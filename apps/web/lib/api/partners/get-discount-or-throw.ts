import { DiscountSchema } from "@/lib/zod/schemas/discount";
import { prisma } from "@dub/prisma";
import { DubApiError } from "../errors";

export async function getDiscountOrThrow({
  discountId,
  programId,
}: {
  discountId: string;
  programId: string;
}) {
  const discount = await prisma.discount.findUnique({
    where: {
      id: discountId,
    },
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

  return DiscountSchema.parse(discount);
}
