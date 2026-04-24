import { prisma } from "@dub/prisma";
import { Discount, DiscountCode } from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK, chunk } from "@dub/utils";
import { enqueueBatchJobs } from "../cron/enqueue-batch-jobs";

type DiscountCodePayload = Pick<DiscountCode, "id" | "code" | "programId">;

type DeleteDiscountCodesParams = DiscountCodePayload & {
  discount: Pick<Discount, "provider"> | null;
};

// Triggered in the following cases:
// 1. When a discount is deleted
// 2. When a link is deleted that has a discount code associated with it
// 3. When partners are banned / deactivated
// 4. When a partner is moved to a different group
export async function deleteDiscountCodes(
  input: (DeleteDiscountCodesParams | null | undefined)[],
) {
  const raw = Array.isArray(input) ? input : [input];
  const discountCodes = raw.filter(
    (dc): dc is NonNullable<typeof dc> => dc != null,
  );

  if (discountCodes.length === 0) {
    return;
  }

  // Delete the discount codes from the database
  const deletedDiscountCodes = await prisma.discountCode.deleteMany({
    where: {
      id: {
        in: discountCodes.map(({ id }) => id),
      },
    },
  });

  console.log(
    `Deleted ${deletedDiscountCodes.count} discount codes.`,
    discountCodes.map(({ id, code }) => ({ id, code })),
  );

  // Queue the job to remove the discount codes from provider
  const chunks = chunk(discountCodes, 100);

  for (const chunkOfCodes of chunks) {
    await enqueueBatchJobs(
      chunkOfCodes.map((discountCode) => ({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/discount-codes/delete`,
        method: "POST",
        queueName: "delete-discount-code",
        body: {
          code: discountCode.code,
          programId: discountCode.programId,
          provider: discountCode.discount?.provider,
        },
      })),
    );
  }
}
