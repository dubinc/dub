"use server";

import { prisma } from "@/lib/prisma";
import { WEBHOOK_TRIGGERS } from "../webhook/constants";
import { publishWebhookEventToQStash } from "../webhook/qstash";
import { samplePayload } from "../webhook/sample-events/payload";
import z from "../zod";
import { webhookPayloadSchema } from "../zod/schemas/webhooks";
import { authActionClient } from "./safe-action";

const schema = z.object({
  workspaceId: z.string(),
  webhookId: z.string(),
  trigger: z.enum(WEBHOOK_TRIGGERS),
});

// Test send webhook event
export const testSendWebhookEvent = authActionClient
  .schema(schema)
  .action(async ({ ctx, parsedInput }) => {
    const { workspace } = ctx;
    const { webhookId, trigger } = parsedInput;

    const webhook = await prisma.webhook.findUniqueOrThrow({
      where: {
        id: webhookId,
        projectId: workspace.id,
      },
      select: {
        id: true,
        url: true,
        secret: true,
      },
    });

    const payload = samplePayload[trigger] as z.infer<
      typeof webhookPayloadSchema
    >;

    await publishWebhookEventToQStash({
      webhook,
      payload,
    });

    return { ok: true };
  });
