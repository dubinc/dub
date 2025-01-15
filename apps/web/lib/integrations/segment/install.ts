"use server";

import { authActionClient } from "@/lib/actions/safe-action";
import { SegmentRegion } from "@/lib/types";
import { createWebhook } from "@/lib/webhook/create-webhook";
import { WebhookReceiver } from "@dub/prisma/client";
import { SEGMENT_INTEGRATION_ID } from "@dub/utils";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { installIntegration } from "../install";
import { regionToUrl } from "./utils";

const schema = z.object({
  writeKey: z.string().min(1).max(40),
  region: SegmentRegion.default("us-west-2"),
  workspaceId: z.string(),
});

export const installSegmentAction = authActionClient
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { writeKey, region } = parsedInput;

    const installation = await installIntegration({
      integrationId: SEGMENT_INTEGRATION_ID,
      userId: user.id,
      workspaceId: workspace.id,
      credentials: {
        writeKey,
        region,
      },
    });

    await createWebhook({
      name: "Segment",
      url: regionToUrl[region],
      receiver: WebhookReceiver.segment,
      triggers: [],
      workspace,
      secret: writeKey,
      installationId: installation.id,
    });

    revalidatePath(`/${workspace.slug}/settings/integrations/segment`);
  });
