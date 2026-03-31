"use server";

import { authActionClient } from "@/lib/actions/safe-action";
import { prisma } from "@dub/prisma";
import { HUBSPOT_INTEGRATION_ID } from "@dub/utils";
import { revalidatePath } from "next/cache";
import * as z from "zod/v4";
import { hubSpotSettingsSchema } from "./schema";

const schema = hubSpotSettingsSchema.extend({
  workspaceId: z.string(),
});

export const updateHubSpotSettingsAction = authActionClient
  .inputSchema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { leadTriggerEvent, leadLifecycleStageId, closedWonDealStageId } =
      parsedInput;

    const installedIntegration = await prisma.installedIntegration.findFirst({
      where: {
        integrationId: HUBSPOT_INTEGRATION_ID,
        projectId: workspace.id,
      },
    });

    if (!installedIntegration) {
      throw new Error(
        "HubSpot integration is not installed on your workspace.",
      );
    }

    const current = (installedIntegration.settings as any) ?? {};

    await prisma.installedIntegration.update({
      where: {
        id: installedIntegration.id,
      },
      data: {
        settings: {
          ...current,
          leadTriggerEvent,
          leadLifecycleStageId,
          closedWonDealStageId,
        },
      },
    });

    revalidatePath(`/${workspace.slug}/settings/integrations/hubspot`);
  });
