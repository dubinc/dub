import { getDiscountCode } from "@/lib/api/partners/get-discount-code";
import { withCron } from "@/lib/cron/with-cron";
import { isDiscountCodeDisabled } from "@/lib/discounts/discount-code-status";
import { softDeleteDiscountCodes } from "@/lib/discounts/soft-delete-discount-codes";
import { deleteDiscountCodeJob } from "@/lib/jobs/handlers/delete-discount-code-job";
import { DiscountProvider } from "@prisma/client";
import * as z from "zod/v4";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const inputSchema = z.object({
  code: z.string(),
  programId: z.string(),
  provider: z.enum(DiscountProvider),
});

// TODO: Remove this route once the legacy `delete-discount-code` QStash queue is drained.

// POST /api/cron/discount-codes/disable – disable a discount code from the provider (Stripe, Shopify, etc.)
export const POST = withCron(async ({ rawBody }) => {
  const { code, programId } = inputSchema.parse(JSON.parse(rawBody));

  const discountCode = await getDiscountCode({
    where: {
      programId,
      code,
    },
  });

  if (!discountCode) {
    return logAndRespond(`Discount code ${code} not found. Skipping...`);
  }

  if (!isDiscountCodeDisabled(discountCode)) {
    await softDeleteDiscountCodes({
      where: {
        id: discountCode.id,
      },
    });
  }

  await deleteDiscountCodeJob.dispatch(
    {
      discountCodeId: discountCode.id,
    },
    {
      deduplicationId: `delete-discount-code-${discountCode.id}`,
    },
  );

  return logAndRespond(
    `Queued delete-discount-code-job for discount code ${code}.`,
  );
});
