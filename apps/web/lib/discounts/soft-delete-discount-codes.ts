import { PRISMA_UPDATEMANY_LIMIT } from "@/lib/cron";
import { prisma } from "@/lib/prisma";
import { processInBatches } from "@dub/utils";
import { Prisma } from "@prisma/client";

type SoftDeleteDiscountCodesArgs = {
  where: Prisma.DiscountCodeWhereInput;
  tx?: Prisma.TransactionClient | typeof prisma;
};

const MAX_BATCHES = 10;

// Soft-delete live discount codes matching `where`: set isDeleted and clear linkId.
// isDeleted stays non-null so MySQL can enforce one live code per program.
export async function softDeleteDiscountCodes({
  where,
  tx = prisma,
}: SoftDeleteDiscountCodesArgs) {
  let count = 0;
  let hasMore = true;

  while (hasMore) {
    ({ hasMore } = await processInBatches(MAX_BATCHES, async () => {
      const result = await tx.discountCode.updateMany({
        where: {
          ...where,
          isDeleted: false,
        },
        data: {
          isDeleted: true,
          linkId: null,
        },
        limit: PRISMA_UPDATEMANY_LIMIT,
      });

      count += result.count;

      return result;
    }));
  }

  return {
    count,
  };
}
