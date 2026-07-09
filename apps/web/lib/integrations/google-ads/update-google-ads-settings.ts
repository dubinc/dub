"use server";

import { authActionClient } from "@/lib/actions/safe-action";
import { throwIfNoPermission } from "@/lib/actions/throw-if-no-permission";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { prisma } from "@/lib/prisma";
import { GOOGLE_ADS_INTEGRATION_ID } from "@dub/utils";
import { revalidatePath } from "next/cache";
import * as z from "zod/v4";
import { findGoogleAdsCustomer, inferLoginCustomerId } from "./api";
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

    throwIfNoPermission({
      role: workspace.role,
      requiredPermissions: ["integrations.write"],
    });

    if (!getPlanCapabilities(workspace.plan).canInstallAdvancedIntegrations) {
      throw new Error(
        "Google Ads integration is only available on Advanced and Enterprise plans.",
      );
    }

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

    if (customerId) {
      const selectedCustomer = findGoogleAdsCustomer({
        customers: currentSettings.customers,
        customerId,
      });

      if (!selectedCustomer) {
        throw new Error(
          "The selected Google Ads account is not available for this workspace. Please reconnect the integration.",
        );
      }
    }

    let resolvedLoginCustomerId = loginCustomerId ?? null;

    if (resolvedLoginCustomerId) {
      const loginCustomer = findGoogleAdsCustomer({
        customers: currentSettings.customers,
        customerId: resolvedLoginCustomerId,
      });

      if (!loginCustomer) {
        throw new Error(
          "The selected Google Ads login account is not available for this workspace. Please reconnect the integration.",
        );
      }
    } else if (customerId) {
      resolvedLoginCustomerId = inferLoginCustomerId({
        customers: currentSettings.customers,
        selectedCustomerId: customerId,
      });
    }

    if (customerId) {
      const normalizedCustomerId = customerId.replace(/-/g, "");
      const expectedPrefix = `customers/${normalizedCustomerId}/conversionActions/`;

      if (
        leadConversionAction &&
        !leadConversionAction.startsWith(expectedPrefix)
      ) {
        throw new Error("Invalid lead conversion action.");
      }

      if (
        saleConversionAction &&
        !saleConversionAction.startsWith(expectedPrefix)
      ) {
        throw new Error("Invalid sale conversion action.");
      }
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
