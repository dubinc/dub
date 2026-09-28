import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

type SoftDeleteDiscountCodesArgs = {
  where: Prisma.DiscountCodeWhereInput;
  tx?: Prisma.TransactionClient | typeof prisma;
};

// Soft-delete live discount codes matching `where`: set isDeleted and clear linkId.
// isDeleted stays non-null so MySQL can enforce one live code per program.
export async function softDeleteDiscountCodes({
  where,
  tx = prisma,
}: SoftDeleteDiscountCodesArgs) {
  return await tx.discountCode.updateMany({
    where: {
      ...where,
      isDeleted: false,
    },
    data: {
      isDeleted: true,
      linkId: null,
    },
  });
}
