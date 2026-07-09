"use server";

import { authActionClient } from "@/lib/actions/safe-action";
import { prisma } from "@/lib/prisma";
import { GOOGLE_ADS_INTEGRATION_ID } from "@dub/utils";
import { revalidatePath } from "next/cache";
import * as z from "zod/v4";
import { inferLoginCustomerId } from "./api";
import { googleAdsSettingsSchema } from "./schema";

const schema = googleAdsSettingsSchema.omit({ customers: true }).extend({
  workspaceId: z.string(),
});

export const updateGoogleAdsSettingsAction = authActionClient
  .inputSchema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const {
      customerId,
      loginCustomerId,
      customerName,
      leadConversionAction,
      saleConversionAction,
    } = parsedInput;

    const installedIntegration = await prisma.installedIntegration.findFirst({
      where: {
        integrationId: GOOGLE_ADS_INTEGRATION_ID,
        projectId: workspace.id,
      },
    });

    if (!installedIntegration) {
      throw new Error(
        "Google Ads integration is not installed on your workspace.",
      );
    }

    const currentSettings = googleAdsSettingsSchema.parse(
      installedIntegration.settings ?? {},
    );

    let resolvedLoginCustomerId = loginCustomerId ?? null;

    if (!resolvedLoginCustomerId && customerId) {
      resolvedLoginCustomerId = inferLoginCustomerId({
        customers: currentSettings.customers,
        selectedCustomerId: customerId,
      });
    }

    await prisma.installedIntegration.update({
      where: {
        id: installedIntegration.id,
      },
      data: {
        settings: {
          ...currentSettings,
          customerId,
          loginCustomerId: resolvedLoginCustomerId,
          customerName,
          leadConversionAction,
          saleConversionAction,
        },
      },
    });

    revalidatePath(`/${workspace.slug}/settings/integrations/google-ads`);
  });
