import { remapDiscountCodes } from "@/lib/discounts/remap-discount-codes";
import { prisma } from "@/lib/prisma";
import * as z from "zod/v4";
import { defineJob } from "../index";

const BATCH_SIZE = 25;

const inputSchema = z.object({
  programId: z.string(),
  discountId: z.string(),
  partnerIds: z.array(z.string()),
});

// Remap partner discount codes onto the restored group default, then delete
// the additional discount. Equivalence checks need both discount rows to exist.
export const deleteDiscountJob = defineJob({
  name: "delete-discount-job",
  schema: inputSchema,
  async handle(input) {
    const { programId, discountId, partnerIds } = input;

    const discount = await prisma.discount.findUnique({
      where: {
        id: discountId,
      },
      select: {
        id: true,
      },
    });

    if (!discount) {
      console.info(
        `[deleteDiscountJob] Discount ${discountId} not found. Skipping...`,
      );
      return;
    }

    for (const partnerId of partnerIds.slice(0, BATCH_SIZE)) {
      await remapDiscountCodes({
        programId,
        partnerId,
      });
    }

    const remainingPartnerIds = partnerIds.slice(BATCH_SIZE);

    if (remainingPartnerIds.length > 0) {
      await deleteDiscountJob.dispatch(
        {
          programId,
          discountId,
          partnerIds: remainingPartnerIds,
        },
        {
          delay: 1,
          label: discountId,
          flowControl: {
            key: `delete-discount-${discountId}`,
            parallelism: 1,
          },
        },
      );
      return;
    }

    await prisma.discount.deleteMany({
      where: {
        id: discountId,
      },
    });

    console.info(`[deleteDiscountJob] Deleted discount ${discountId}.`);
  },
});
