"use server";

import { authActionClient } from "@/lib/actions/safe-action";
import { googleAdsProvider } from "@/lib/integrations/google-ads/provider";
import { prisma } from "@/lib/prisma";
import { GOOGLE_ADS_INTEGRATION_ID } from "@dub/utils/src/constants/integrations";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import {
  googleAdsSettingsSchema,
  updateGoogleAdsSettingsSchema,
} from "./schema";

export const updateGoogleAdsSettingsAction = authActionClient
  .inputSchema(updateGoogleAdsSettingsSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { customerId, leadConversionActionId, saleConversionActionId } =
      parsedInput;

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

    const normalizedCustomerId = customerId?.trim() || null;
    const currentSettings = googleAdsProvider.getSettings(installation);

    let credentials: Prisma.InputJsonValue | undefined =
      installation.credentials ?? undefined;

    if (
      normalizedCustomerId &&
      normalizedCustomerId !== currentSettings.customerId
    ) {
      credentials = await googleAdsProvider.selectCustomerAccount(
        installation,
        normalizedCustomerId,
      );
    }

    const settings = googleAdsSettingsSchema.parse({
      ...currentSettings,
      customerId: normalizedCustomerId,
      leadConversionActionId,
      saleConversionActionId,
    });

    if (credentials !== installation.credentials) {
      await googleAdsProvider.updateInstallation(installation, {
        settings,
        ...(credentials !== undefined ? { credentials } : {}),
      });
    } else {
      await googleAdsProvider.updateInstallation(installation, {
        settings,
      });
    }

    revalidatePath(
      `/${workspace.slug}/settings/integrations/${installation.integration.slug}`,
    );
  });
