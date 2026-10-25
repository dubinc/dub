"use server";

import { authActionClient } from "@/lib/actions/safe-action";
import { prisma } from "@/lib/prisma";
import { APPSFLYER_INTEGRATION_ID } from "@dub/utils";
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
        },
      },
    });

    revalidatePath(`/${workspace.slug}/settings/integrations/appsflyer`);
  });
