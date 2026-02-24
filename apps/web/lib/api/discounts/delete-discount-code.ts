import { qstash } from "@/lib/cron";
import { prisma } from "@dub/prisma";
import { DiscountCode } from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK, chunk } from "@dub/utils";

const queue = qstash.queue({
  queueName: "delete-discount-code",
});

type DiscountCodePayload = Pick<DiscountCode, "id" | "code" | "programId">;

type DeleteDiscountCodesParams =
  | DiscountCodePayload
  | (DiscountCodePayload | null | undefined)[];

// Triggered in the following cases:
// 1. When a discount is deleted
// 2. When a link is deleted that has a discount code associated with it
// 3. When partners are banned / deactivated
// 4. When a partner is moved to a different group
export async function deleteDiscountCodes(input: DeleteDiscountCodesParams) {
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

  // Queue the job to remove the discount codes from Stripe
  const chunks = chunk(discountCodes, 100);

  for (const chunkOfCodes of chunks) {
    await Promise.allSettled(
      chunkOfCodes.map((discountCode) =>
        queue.enqueueJSON({
          url: `${APP_DOMAIN_WITH_NGROK}/api/cron/discount-codes/delete`,
          method: "POST",
          body: {
            code: discountCode.code,
            programId: discountCode.programId,
          },
        }),
      ),
    );
  }
}
