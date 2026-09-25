import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

type SoftDeleteDiscountCodesArgs = {
  where: Prisma.DiscountCodeWhereInput;
  tx?: Prisma.TransactionClient | typeof prisma;
};

// Soft-delete live discount codes matching `where`: set deletedAt and clear linkId.
export async function softDeleteDiscountCodes({
  where,
  tx = prisma,
}: SoftDeleteDiscountCodesArgs) {
  const { count } = await tx.discountCode.updateMany({
    where: {
      ...where,
      deletedAt: null,
    },
    data: {
      deletedAt: new Date(),
      linkId: null,
    },
  });

  console.log(`Soft-deleted ${count} discount codes.`);

  return count;
}
