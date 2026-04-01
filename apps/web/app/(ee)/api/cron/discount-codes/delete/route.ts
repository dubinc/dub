import { withCron } from "@/lib/cron/with-cron";
import { stripeIntegrationSettingsSchema } from "@/lib/integrations/stripe/schema";
import { disableStripeDiscountCode } from "@/lib/stripe/disable-stripe-discount-code";
import { prisma } from "@dub/prisma";
import { STRIPE_INTEGRATION_ID } from "@dub/utils";
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
      id: true,
      stripeConnectId: true,
      installedIntegrations: {
        where: {
          integrationId: STRIPE_INTEGRATION_ID,
        },
      },
    },
  });

  if (!workspace.stripeConnectId || !workspace.installedIntegrations.length) {
    return logAndRespond(
      `Workspace ${workspace.id} does not have the Stripe integration installed. Skipping...`,
    );
  }

  const stripeIntegrationSettings = stripeIntegrationSettingsSchema.parse(
    workspace.installedIntegrations[0].settings,
  );

  const disabledDiscountCode = await disableStripeDiscountCode({
    code,
    stripeConnectId: workspace.stripeConnectId,
    stripeMode: stripeIntegrationSettings.stripeMode,
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
