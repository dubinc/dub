"use server";

import { authActionClient } from "@/lib/actions/safe-action";
import { throwIfNoPermission } from "@/lib/actions/throw-if-no-permission";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { prisma } from "@/lib/prisma";
import { GOOGLE_ADS_INTEGRATION_ID } from "@dub/utils";
import { revalidatePath } from "next/cache";
import * as z from "zod/v4";
import { inferLoginCustomerId } from "./api";
import { googleAdsSettingsSchema } from "./schema";
import { getGoogleAdsEventMappingsError } from "./utils";

const schema = googleAdsSettingsSchema.omit({ customers: true }).extend({
  workspaceId: z.string(),
});

const uniqueMappingEventNames = (
  mappings: z.infer<typeof googleAdsSettingsSchema>["leadMappings"],
) =>
  mappings.map((mapping) => ({
    ...mapping,
    eventNames: [...new Set(mapping.eventNames)],
  }));

export const updateGoogleAdsSettingsAction = authActionClient
  .inputSchema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const {
      customerId,
      customerName,
      loginCustomerId: submittedLoginCustomerId,
      leadMappings,
      saleMappings,
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
      const normalizedCustomerId = customerId.replace(/-/g, "");
      const selectedCustomer = currentSettings.customers.find(
        (customer) => customer.id.replace(/-/g, "") === normalizedCustomerId,
      );

      if (!selectedCustomer) {
        throw new Error(
          "The selected Google Ads account is not available for this workspace. Please reconnect the integration.",
        );
      }
    }

    const resolvedLoginCustomerId = customerId
      ? submittedLoginCustomerId?.replace(/-/g, "") ||
        inferLoginCustomerId({
          customers: currentSettings.customers,
          selectedCustomerId: customerId,
        })
      : null;

    if (!customerId && (leadMappings.length || saleMappings.length)) {
      throw new Error(
        "A Google Ads account is required to configure conversion actions.",
      );
    }

    if (customerId) {
      const normalizedCustomerId = customerId.replace(/-/g, "");
      const expectedPrefix = `customers/${normalizedCustomerId}/conversionActions/`;

      if (
        leadMappings.some(
          (mapping) => !mapping.conversionAction.startsWith(expectedPrefix),
        )
      ) {
        throw new Error("Invalid lead conversion action.");
      }

      if (
        saleMappings.some(
          (mapping) => !mapping.conversionAction.startsWith(expectedPrefix),
        )
      ) {
        throw new Error("Invalid sale conversion action.");
      }
    }

    const leadMappingsError = getGoogleAdsEventMappingsError(leadMappings);
    if (leadMappingsError) {
      throw new Error(`Lead events: ${leadMappingsError}`);
    }

    const saleMappingsError = getGoogleAdsEventMappingsError(saleMappings);
    if (saleMappingsError) {
      throw new Error(`Sale events: ${saleMappingsError}`);
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
          leadMappings: uniqueMappingEventNames(leadMappings),
          saleMappings: uniqueMappingEventNames(saleMappings),
        },
      },
    });

    revalidatePath(`/${workspace.slug}/settings/integrations/google-ads`);
  });
