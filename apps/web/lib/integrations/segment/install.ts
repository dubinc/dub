"use server";

import { authActionClient } from "@/lib/actions/safe-action";
import { createWebhook } from "@/lib/webhook/create-webhook";
import { WebhookReceiver } from "@dub/prisma/client";
import { SEGMENT_INTEGRATION_ID } from "@dub/utils";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { installIntegration } from "../install";
import { segmentRegions } from "./utils";

const schema = z.object({
  writeKey: z.string().min(1).max(40),
  region: z.enum(segmentRegions.map((r) => r.value) as [string, ...string[]]),
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

    const url = segmentRegions.find((r) => r.value === region)?.url;

    if (!url) {
      throw new Error("Invalid region.");
    }

    await createWebhook({
      name: "Segment",
      url,
      receiver: WebhookReceiver.segment,
      triggers: [],
      workspace,
      secret: writeKey,
      installationId: installation.id,
    });

    revalidatePath(`/${workspace.slug}/settings/integrations/segment`);
  });
