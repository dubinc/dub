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
    const claimedIds = await prisma.$transaction(async (tx) => {
      const candidates = await tx.discountCode.findMany({
        where: {
          ...where,
          disabledAt: null,
        },
        select: {
          id: true,
        },
        orderBy: {
          id: "asc",
        },
        take: BATCH_SIZE,
      });

      if (candidates.length === 0) {
        return null;
      }

      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT id
        FROM DiscountCode
        WHERE id IN (${Prisma.join(pluck(candidates, "id"))}) AND disabledAt IS NULL
        ORDER BY id
        FOR UPDATE
      `;

      if (locked.length === 0) {
        return [];
      }

      const ids = pluck(locked, "id");

      await tx.discountCode.updateMany({
        where: {
          id: {
            in: ids,
          },
          disabledAt: null,
        },
        data: {
          disabledAt: new Date(),
        },
      });

      return ids;
    });

    if (claimedIds === null) {
      break;
    }

    if (claimedIds.length === 0) {
      continue;
    }

    await deleteDiscountCodeJob.dispatchBatch(
      claimedIds.map((id) => ({
        discountCodeId: id,
      })),
      ({ discountCodeId }) => ({
        deduplicationId: `delete-discount-code-${discountCodeId}`,
      }),
    );

    disabledCount += claimedIds.length;
  }

  console.log(`Disabled ${disabledCount} discount codes.`);

  return disabledCount;
}
