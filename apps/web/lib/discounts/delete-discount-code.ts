import { prisma } from "@/lib/prisma";
import { DiscountCodeWebhookSchema } from "@/lib/zod/schemas/discount";
import { APP_DOMAIN_WITH_NGROK, chunk } from "@dub/utils";
import { Discount, DiscountCode, DiscountProvider } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import * as z from "zod/v4";
import { enqueueBatchJobs } from "../cron/enqueue-batch-jobs";
import { sendDiscountCodeWebhook } from "./discount-code-webhook";

type DiscountCodeWebhookDiscount = z.infer<
  typeof DiscountCodeWebhookSchema
>["discount"];

type DeleteDiscountCodesParams = Pick<
  DiscountCode,
  "id" | "code" | "programId" | "partnerId" | "linkId" | "disabledAt"
> & {
  discount: DiscountCodeWebhookDiscount;
};

type EnqueueDeleteDiscountCodeParams = Pick<
  DiscountCode,
  "code" | "programId"
> & {
  discount: Pick<Discount, "provider"> | null;
};

// Triggered in the following cases:
// 1. When a discount is deleted
// 2. When a link is deleted that has a discount code associated with it
// 3. When partners are banned / deactivated
// 4. When a partner is moved to a different group
export async function deleteDiscountCodes(
  input: (DeleteDiscountCodesParams | null | undefined)[],
  { isSoftDelete = false }: { isSoftDelete?: boolean } = {},
) {
  const discountCodes = input.filter(
    (dc): dc is NonNullable<typeof dc> => dc != null,
  );

  if (discountCodes.length === 0) {
    console.log(
      "[deleteDiscountCodes] No discount codes to delete. Skipping...",
    );
    return;
  }

  if (isSoftDelete) {
    const disabledAt = new Date();

    // Soft delete the discount codes from the database (mark them as disabled)
    const disabledDiscountCodes = await prisma.discountCode.updateMany({
      where: {
        id: {
          in: discountCodes.map(({ id }) => id),
        },
      },
      data: {
        disabledAt,
      },
    });

    console.log(
      `[deleteDiscountCodes] Disabled ${disabledDiscountCodes.count} discount codes.`,
    );

    waitUntil(
      sendDiscountCodeDeletedWebhooks(
        discountCodes.map((discountCode) => ({
          ...discountCode,
          disabledAt,
        })),
      ),
    );
  } else {
    // Delete the discount codes from the database
    const deletedDiscountCodes = await prisma.discountCode.deleteMany({
      where: {
        id: {
          in: discountCodes.map(({ id }) => id),
        },
      },
    });

    console.log(
      `[deleteDiscountCodes] Deleted ${deletedDiscountCodes.count} discount codes.`,
    );

    waitUntil(sendDiscountCodeDeletedWebhooks(discountCodes));
  }

  await enqueueDeleteDiscountCode(discountCodes);
}

// Only enqueue external-provider cleanup for codes whose provider is known.
// Orphaned codes (discount relation is null) still get deleted locally above
// but we can't tell which external provider to clean up, so we skip them.
// Custom providers disable via webhook, so they are not queued.
export async function enqueueDeleteDiscountCode(
  discountCodes: EnqueueDeleteDiscountCodeParams[],
) {
  const codesWithProvider = discountCodes.filter(
    (dc): dc is typeof dc & { discount: Pick<Discount, "provider"> } =>
      dc.discount != null && dc.discount.provider !== DiscountProvider.custom,
  );

  if (codesWithProvider.length === 0) {
    return;
  }

  // Queue the job to remove the discount codes from provider
  const chunks = chunk(codesWithProvider, 100);

  for (const chunkOfCodes of chunks) {
    await enqueueBatchJobs(
      chunkOfCodes.map((discountCode) => ({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/discount-codes/disable`,
        method: "POST",
        queueName: "delete-discount-code",
        body: {
          code: discountCode.code,
          programId: discountCode.programId,
          provider: discountCode.discount.provider,
        },
      })),
    );
  }
}

async function sendDiscountCodeDeletedWebhooks(
  discountCodes: DeleteDiscountCodesParams[],
) {
  const programIds = [...new Set(discountCodes.map((dc) => dc.programId))];

  const workspaces = await prisma.project.findMany({
    where: {
      defaultProgramId: {
        in: programIds,
      },
    },
    select: {
      id: true,
      webhookEnabled: true,
      defaultProgramId: true,
    },
  });

  const workspaceByProgramId = new Map(
    workspaces.map((workspace) => [workspace.defaultProgramId, workspace]),
  );

  await Promise.all(
    discountCodes.map((discountCode) => {
      const workspace = workspaceByProgramId.get(discountCode.programId);

      if (!workspace) {
        return;
      }

      return sendDiscountCodeWebhook({
        trigger: "discount_code.deleted",
        workspace,
        data: DiscountCodeWebhookSchema.parse(discountCode),
      });
    }),
  );
}
