import { withCron } from "@/lib/cron/with-cron";
import { isDiscountIntegrationNotAvailableError } from "@/lib/discounts/discount-error";
import { getDiscountProvider } from "@/lib/discounts/discount-provider";
import { prisma } from "@dub/prisma";
import { DiscountProvider } from "@dub/prisma/client";
import * as z from "zod/v4";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const inputSchema = z.object({
  code: z.string(),
  programId: z.string(),
  provider: z.enum(DiscountProvider),
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
    if (isDiscountIntegrationNotAvailableError(error)) {
      return logAndRespond(`Skipping ${code}: ${error.message}`);
    }

    throw error;
  }

  return logAndRespond(`Discount code ${code} disabled from ${provider}.`);
});
