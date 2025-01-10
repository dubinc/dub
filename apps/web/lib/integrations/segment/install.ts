"use server";

import { authActionClient } from "@/lib/actions/safe-action";
import { createWebhook } from "@/lib/webhook/create-webhook";
import { WebhookReceiver } from "@dub/prisma/client";
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

    const installation = await installIntegration({
      integrationId: SEGMENT_INTEGRATION_ID,
      userId: user.id,
      workspaceId: workspace.id,
      credentials: {
        writeKey,
      },
    });

    await createWebhook({
      name: "Segment",
      url: "https://api.segment.io/v1/track",
      receiver: WebhookReceiver.segment,
      triggers: [],
      workspace,
      secret: writeKey,
      installationId: installation.id,
    });

    revalidatePath(`/${workspace.slug}/settings/integrations/segment`);
  });
