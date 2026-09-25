import { prisma } from "@/lib/prisma";
import { sendWorkspaceWebhook } from "../webhook/publish";
import { DiscountCodeWebhookSchema } from "../zod/schemas/discount";
import { isNonRecoverableDiscountError } from "./discount-error";
import { getDiscountProvider } from "./discount-provider";
import { isDiscountCodeDeleted } from "./is-discount-code-deleted";

export async function hardDeleteDiscountCode({
  discountCodeId,
}: {
  discountCodeId: string;
}) {
  const discountCode = await prisma.discountCode.findUnique({
    where: {
      id: discountCodeId,
    },
    include: {
      discount: true,
      program: {
        select: {
          workspace: {
            select: {
              id: true,
              stripeConnectId: true,
              shopifyStoreId: true,
              webhookEnabled: true,
            },
          },
        },
      },
    },
  });

  if (!discountCode) {
    console.log(`Discount code ${discountCodeId} not found. Skipping...`);
    return;
  }

  if (!isDiscountCodeDeleted(discountCode)) {
    console.log(`Discount code ${discountCodeId} is not deleted. Skipping...`);
    return;
  }

  const {
    discount,
    program: { workspace },
  } = discountCode;

  // Remove the discount code from the external provider
  if (discount) {
    const discountProvider = getDiscountProvider(discount.provider);

    try {
      await discountProvider.disableDiscountCode({
        workspace,
        code: discountCode.code,
      });

      console.log(
        `Disabled discount code ${discountCode.code} on ${discount.provider}`,
      );
    } catch (error) {
      if (isNonRecoverableDiscountError(error)) {
        console.log(`Skipping ${discountCode.code}: ${error.message}`);
        return;
      }

      throw error;
    }
  }

  await sendWorkspaceWebhook({
    workspace,
    trigger: "discount_code.deleted",
    data: DiscountCodeWebhookSchema.parse(discountCode),
  });

  await prisma.discountCode.deleteMany({
    where: {
      id: discountCodeId,
    },
  });
}
