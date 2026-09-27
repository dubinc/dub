import { prisma } from "@/lib/prisma";
import { pluck } from "@dub/utils";
import { Prisma } from "@prisma/client";
import { deleteDiscountCodeJob } from "../jobs/handlers/delete-discount-code-job";

type DisableDiscountCodesArgs = {
  where: Prisma.DiscountCodeWhereInput;
};

const BATCH_SIZE = 500;

// Disable live discount codes matching `where` (sets disabledAt).
// Used when partners are banned or deactivated — the code string stays reserved.
export async function disableDiscountCodes({
  where,
}: DisableDiscountCodesArgs) {
  let disabledCount = 0;

  while (true) {
    const discountCodes = await prisma.$transaction(async (tx) => {
      const discountCodes = await tx.discountCode.findMany({
        where: {
          ...where,
          disabledAt: null,
        },
        select: {
          id: true,
        },
        take: BATCH_SIZE,
      });

      if (discountCodes.length === 0) {
        return [];
      }

      await tx.discountCode.updateMany({
        where: {
          id: {
            in: pluck(discountCodes, "id"),
          },
        },
        data: {
          disabledAt: new Date(),
        },
      });

      return discountCodes;
    });

    if (discountCodes.length === 0) {
      break;
    }

    await deleteDiscountCodeJob.dispatchBatch(
      discountCodes.map(({ id }) => ({
        discountCodeId: id,
      })),
      ({ discountCodeId }) => ({
        deduplicationId: `delete-discount-code-${discountCodeId}`,
      }),
    );

    disabledCount += discountCodes.length;

    if (discountCodes.length < BATCH_SIZE) {
      break;
    }
  }

  return disabledCount;
}
