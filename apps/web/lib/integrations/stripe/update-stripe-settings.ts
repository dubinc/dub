"use server";

import { authActionClient } from "@/lib/actions/safe-action";
import { prisma } from "@dub/prisma";
import { STRIPE_INTEGRATION_ID } from "@dub/utils";
import { revalidatePath } from "next/cache";
import * as z from "zod/v4";
import { stripeIntegrationSettingsSchema } from "./schema";

const schema = stripeIntegrationSettingsSchema.extend({
  workspaceId: z.string(),
});

export const updateStripeSettingsAction = authActionClient
  .inputSchema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { freeTrials } = parsedInput;

    const installedIntegration = await prisma.installedIntegration.findFirst({
      where: {
        integrationId: STRIPE_INTEGRATION_ID,
        projectId: workspace.id,
      },
    });

    if (!installedIntegration) {
      throw new Error("Stripe integration is not installed on your workspace.");
    }

    const current = (installedIntegration.settings as any) ?? {};

    await prisma.installedIntegration.update({
      where: {
        id: installedIntegration.id,
      },
      data: {
        settings: {
          ...current,
          freeTrials,
        },
      },
    });

    revalidatePath(`/${workspace.slug}/settings/integrations/stripe`);
  });
