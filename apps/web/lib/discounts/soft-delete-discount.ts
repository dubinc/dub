import { dispatchWorkflows } from "@/lib/jobs/publish-workflows";
import { prisma } from "@/lib/prisma";

// Soft delete a discount and dispatch cleanup workflow
export async function softDeleteDiscount({
  discountId,
  programId,
}: {
  discountId: string;
  programId: string;
}) {
  await prisma.$transaction(async (tx) => {
    await tx.partnerGroup.updateMany({
      where: {
        discountId,
      },
      data: {
        discountId: null,
      },
    });

    await tx.discount.update({
      where: {
        id: discountId,
      },
      data: {
        programId: null,
      },
    });
  });

  await dispatchWorkflows({
    name: "discount-deletion-cleanup-workflow",
    payload: {
      programId,
      discountId,
    },
    options: {
      label: discountId,
      deduplicationId: `discount-deletion-cleanup-${discountId}`,
    },
  });
}
