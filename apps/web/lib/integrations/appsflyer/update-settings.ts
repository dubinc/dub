"use server";

import { authActionClient } from "@/lib/actions/safe-action";
import { qstash } from "@/lib/cron";
import { isAppsFlyerTrackingUrl } from "@/lib/middleware/utils/is-appsflyer-tracking-url";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK, APPSFLYER_INTEGRATION_ID } from "@dub/utils";
import { revalidatePath } from "next/cache";
import * as z from "zod/v4";
import { appsFlyerSettingsSchema } from "./schema";

const schema = appsFlyerSettingsSchema.extend({
  workspaceId: z.string(),
});

export const updateAppsFlyerSettingsAction = authActionClient
  .inputSchema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;

    // Normalize: trim whitespace and drop empty entries
    const appIds = parsedInput.appIds
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    const requiredParameters = parsedInput.requiredParameters.map((p) => ({
      key: p.key.trim(),
      value: p.value.trim(),
    }));

    const parameters = parsedInput.parameters
      .map((p) => ({
        key: p.key.trim(),
        value: p.value.trim(),
      }))
      .filter((p) => p.key.length > 0 && p.value.length > 0);

    const installedIntegration = await prisma.installedIntegration.findFirst({
      where: {
        integrationId: APPSFLYER_INTEGRATION_ID,
        projectId: workspace.id,
      },
      select: {
        id: true,
        settings: true,
      },
    });

    if (!installedIntegration) {
      throw new Error(
        "AppsFlyer integration is not installed on your workspace.",
      );
    }

    const current = appsFlyerSettingsSchema.parse(
      installedIntegration.settings ?? {},
    );

    await prisma.installedIntegration.update({
      where: {
        id: installedIntegration.id,
      },
      data: {
        settings: {
          ...current,
          appIds,
          requiredParameters,
          parameters,
        },
      },
    });

    const parametersChanged =
      JSON.stringify(current.parameters) !== JSON.stringify(parameters) ||
      JSON.stringify(current.requiredParameters) !==
        JSON.stringify(requiredParameters);

    // Re-apply updated parameters to all existing AppsFlyer default links
    if (parametersChanged) {
      const defaultLinks = await prisma.partnerGroupDefaultLink.findMany({
        where: {
          program: {
            workspaceId: workspace.id,
          },
        },
        select: {
          id: true,
          url: true,
        },
      });

      const appsFlyerDefaultLinks = defaultLinks.filter((link) =>
        isAppsFlyerTrackingUrl(link.url),
      );

      if (appsFlyerDefaultLinks.length > 0) {
        await Promise.allSettled(
          appsFlyerDefaultLinks.map((defaultLink) =>
            qstash.publishJSON({
              url: `${APP_DOMAIN_WITH_NGROK}/api/cron/groups/update-default-links`,
              body: {
                defaultLinkId: defaultLink.id,
              },
            }),
          ),
        );
      }
    }

    revalidatePath(`/${workspace.slug}/settings/integrations/appsflyer`);
  });
