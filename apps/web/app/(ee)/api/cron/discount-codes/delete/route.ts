import { withCron } from "@/lib/cron/with-cron";
import { getDiscountProvider } from "@/lib/discounts/discount-provider";
import { prisma } from "@dub/prisma";
import { DiscountProvider } from "@dub/prisma/client";
import * as z from "zod/v4";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const inputSchema = z.object({
  provider: z.enum(DiscountProvider),
  code: z.string(),
  programId: z.string(),
});

// POST /api/cron/discount-codes/delete
export const POST = withCron(async ({ rawBody }) => {
  const { provider, code, programId } = inputSchema.parse(JSON.parse(rawBody));

  const workspace = await prisma.project.findUniqueOrThrow({
    where: {
      defaultProgramId: programId,
    },
    select: {
      id: true,
      stripeConnectId: true,
      shopifyStoreId: true,
    },
  });

  const discountProvider = getDiscountProvider(provider);

  try {
    await discountProvider.disableDiscountCode({
      workspace,
      code,
    });
  } catch (error) {
    const message: string = error?.message ?? "";
    if (
      message.startsWith("STRIPE_CONNECTION_REQUIRED") ||
      message.startsWith("SHOPIFY_CONNECTION_REQUIRED") ||
      message.startsWith("SHOPIFY_APP_UPGRADE_REQUIRED")
    ) {
      return logAndRespond(`Skipping ${code}: ${message}`);
    }
    throw error;
  }

  return logAndRespond(`Discount code ${code} disabled from ${provider}.`);
});
