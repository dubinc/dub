import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

type DisableDiscountCodesArgs = {
  where: Prisma.DiscountCodeWhereInput;
  tx?: Prisma.TransactionClient | typeof prisma;
};

// Disable live discount codes matching `where` (sets disabledAt).
// Used when partners are banned or deactivated — the code string stays reserved.
export async function disableDiscountCodes({
  where,
  tx = prisma,
}: DisableDiscountCodesArgs) {
  const { count } = await tx.discountCode.updateMany({
    where: {
      ...where,
      deletedAt: null,
      disabledAt: null,
    },
    data: {
      disabledAt: new Date(),
    },
  });

  console.log(`Disabled ${count} discount codes.`);

  return count;
}
