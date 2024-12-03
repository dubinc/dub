"use server";

import { authActionClient } from "@/lib/actions/safe-action";
import { addWebhook } from "@/lib/webhook/api";
import { SEGMENT_INTEGRATION_ID } from "@dub/utils";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { installIntegration } from "../install";

const schema = z.object({
  writeKey: z.string().min(1).max(40),
  workspaceId: z.string(),
});

export const installSegmentAction = authActionClient
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { writeKey } = parsedInput;

    const webhook = await addWebhook({
      name: "Segment",
      url: "https://api.segment.io/v1/track",
      triggers: ["link.clicked"],
      workspace,
      secret: writeKey, // TODO (Kiran): Might need rethink this
    });

    await installIntegration({
      integrationId: SEGMENT_INTEGRATION_ID,
      userId: user.id,
      workspaceId: workspace.id,
      credentials: {
        writeKey,
        webhookId: webhook.id,
      },
    });

    revalidatePath(`/${workspace.slug}/settings/integrations/segment`);
  });
