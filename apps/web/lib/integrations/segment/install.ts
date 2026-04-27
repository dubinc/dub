"use server";

import { authActionClient } from "@/lib/actions/safe-action";
import { encrypt } from "@/lib/encryption";
import { createWebhook } from "@/lib/webhook/create-webhook";
import { WebhookReceiver } from "@dub/prisma/client";
import { SEGMENT_INTEGRATION_ID } from "@dub/utils";
import { revalidatePath } from "next/cache";
import * as z from "zod/v4";
import { installIntegration } from "../install";
import { segmentCredentialsSchema } from "./schema";

const inputSchema = segmentCredentialsSchema.extend({
  workspaceId: z.string(),
});

export const installSegmentAction = authActionClient
  .inputSchema(inputSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { writeKey } = parsedInput;

    const installation = await installIntegration({
      integrationId: SEGMENT_INTEGRATION_ID,
      userId: user.id,
      workspaceId: workspace.id,
      credentials: {
        writeKey: encrypt(writeKey),
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
