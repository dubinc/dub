import { withCron } from "@/lib/cron/with-cron";
import { disableStripeDiscountCode } from "@/lib/stripe/disable-stripe-discount-code";
import { prisma } from "@dub/prisma";
import * as z from "zod/v4";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const inputSchema = z.object({
  code: z.string(),
  programId: z.string(),
});

// POST /api/cron/discount-codes/delete
export const POST = withCron(async ({ rawBody }) => {
  const { code, programId } = inputSchema.parse(JSON.parse(rawBody));

  const workspace = await prisma.project.findUniqueOrThrow({
    where: {
      defaultProgramId: programId,
    },
    select: {
      stripeConnectId: true,
    },
  });

  const disabledDiscountCode = await disableStripeDiscountCode({
    code,
    stripeConnectId: workspace.stripeConnectId,
  });

  if (!disabledDiscountCode) {
    return logAndRespond(
      `Failed to disable discount code ${code} in Stripe for ${workspace.stripeConnectId}.`,
    );
  }

  return logAndRespond(
    `Discount code ${code} disabled from Stripe for ${workspace.stripeConnectId}.`,
  );
});
