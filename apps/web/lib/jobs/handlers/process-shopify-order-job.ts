import { captureWebhookLog } from "@/lib/api-logs/capture-webhook-log";
import { processShopifyOrder } from "@/lib/integrations/shopify/process-order";
import { shopifyOrderSchema } from "@/lib/integrations/shopify/schema";
import { prisma } from "@/lib/prisma";
import { serializeError } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import * as z from "zod/v4";
import { defineJob } from "../index";

const inputSchema = z.object({
  order: shopifyOrderSchema,
  clickId: z.string().nullable(),
  workspaceId: z.string(),
});

// Process the Shopify order
export const processShopifyOrderJob = defineJob({
  name: "process-shopify-order-job",
  schema: inputSchema,
  async handle({ workspaceId, clickId, order }) {
    const startTime = Date.now();

    const workspace = await prisma.project.findUniqueOrThrow({
      where: {
        id: workspaceId,
      },
      select: {
        id: true,
        defaultProgramId: true,
        webhookEnabled: true,
      },
    });

    const requestLog = {
      workspaceId: workspace.id,
      method: "POST",
      path: "/shopify/integration/webhook" as const,
      requestBody: order,
      userAgent: "Shopify Order Job",
    };

    try {
      const result = await processShopifyOrder({
        order,
        workspace,
        clickId,
      });

      waitUntil(
        captureWebhookLog({
          ...requestLog,
          statusCode: 200,
          duration: Date.now() - startTime,
          responseBody: result,
        }),
      );
    } catch (error) {
      waitUntil(
        captureWebhookLog({
          ...requestLog,
          statusCode: 400,
          duration: Date.now() - startTime,
          responseBody: serializeError(error),
        }),
      );
    }
  },
});
