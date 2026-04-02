"use server";

import { authActionClient } from "@/lib/actions/safe-action";
import { APPSFLYER_INTEGRATION_ID } from "@dub/utils";
import { revalidatePath } from "next/cache";
import * as z from "zod/v4";
import { installIntegration } from "../install";

const schema = z.object({
  workspaceId: z.string(),
});

export const installAppsFlyerAction = authActionClient
  .inputSchema(schema)
  .action(async ({ ctx }) => {
    const { workspace, user } = ctx;

    if (["free", "pro"].includes(workspace.plan)) {
      throw new Error(
        "AppsFlyer integration is only available on Business plans and above. Upgrade to get started.",
      );
    }

    await installIntegration({
      integrationId: APPSFLYER_INTEGRATION_ID,
      userId: user.id,
      workspaceId: workspace.id,
    });

    revalidatePath(`/${workspace.slug}/settings/integrations/appsflyer`);
  });
