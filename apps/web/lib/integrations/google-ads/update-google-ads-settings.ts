"use server";

import { authActionClient } from "@/lib/actions/safe-action";
import { googleAdsProvider } from "@/lib/integrations/google-ads/provider";
import { prisma } from "@/lib/prisma";
import { GOOGLE_ADS_INTEGRATION_ID } from "@dub/utils/src/constants/integrations";
import { revalidatePath } from "next/cache";
import {
  googleAdsSettingsSchema,
  updateGoogleAdsSettingsSchema,
} from "./schema";

export const updateGoogleAdsSettingsAction = authActionClient
  .inputSchema(updateGoogleAdsSettingsSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { leadConversionActionId, saleConversionActionId } = parsedInput;

    const installation = await prisma.installedIntegration.findUniqueOrThrow({
      where: {
        userId_integrationId_projectId: {
          userId: ctx.user.id,
          integrationId: GOOGLE_ADS_INTEGRATION_ID,
          projectId: workspace.id,
        },
      },
      select: {
        id: true,
        settings: true,
        credentials: true,
        integration: {
          select: {
            slug: true,
          },
        },
      },
    });

    const currentSettings = googleAdsProvider.getSettings(installation);

    const settings = googleAdsSettingsSchema.parse({
      ...currentSettings,
      leadConversionActionId,
      saleConversionActionId,
    });

    await googleAdsProvider.updateInstallation(installation, {
      settings,
    });

    revalidatePath(
      `/${workspace.slug}/settings/integrations/${installation.integration.slug}`,
    );
  });
