import { withCron } from "@/lib/cron/with-cron";
import { deleteDiscountCodeJob } from "@/lib/jobs/handlers/delete-discount-code-job";
import { prisma } from "@/lib/prisma";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const BATCH_SIZE = 500;

// GET /api/cron/discount-codes/queue-deletes
// Fans out delete-discount-code-job for soft-deleted discount codes.
export const GET = withCron(async () => {
  const discountCodes = await prisma.discountCode.findMany({
    where: {
      deletedAt: {
        not: null,
      },
    },
    select: {
      id: true,
    },
    take: BATCH_SIZE,
    orderBy: {
      deletedAt: "asc",
    },
  });

  if (discountCodes.length === 0) {
    return logAndRespond("No soft-deleted discount codes found. Skipping...");
  }

  await deleteDiscountCodeJob.dispatchBatch(
    discountCodes.map(({ id }) => ({
      discountCodeId: id,
    })),
    ({ discountCodeId }) => ({
      label: discountCodeId,
      deduplicationId: `delete-discount-code-${discountCodeId}`,
    }),
  );

  return logAndRespond(
    `Queued delete-discount-code-job for ${discountCodes.length} soft-deleted discount codes.`,
  );
});
