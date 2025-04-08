import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { isLinkLevelWebhook } from "@/lib/webhook/utils";
import { prisma } from "@dub/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  webhookId: z.string(),
});

// This route is used to sync webhooks with the links cache
// This will be called only for link-level webhooks
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    await verifyQstashSignature({ req, rawBody });

    const { webhookId } = schema.parse(JSON.parse(rawBody));

    const webhook = await prisma.webhook.findUnique({
      where: {
        id: webhookId,
      },
    });

    if (!webhook) {
      return new Response("Webhook not found.");
    }

    if (!isLinkLevelWebhook(webhook)) {
      return new Response("Webhook is not a link-level webhook.");
    }

    let skip = 0;
    const take = 1000;

    const includedCount = 1000;

    while (true) {
      // const links = await prisma.linkWebhook.findMany({
      //   where: {
      //     webhookId,
      //   },
      //   skip,
      //   take,
      // });
      // const includeLinkIds = links
      //   .filter((link) => link.enabled)
      //   .map((link) => link.linkId);
      // const excludeLinkIds = links
      //   .filter((link) => !link.enabled)
      //   .map((link) => link.linkId);
      // // Include all
      // if (includeLinkIds.length === 0 && excludeLinkIds.length === 0) {
      // }
      // // Include specific links
      // else if (includeLinkIds.length > 0 && excludeLinkIds.length === 0) {
      // }
      // // Exclude specific links
      // else if (includeLinkIds.length === 0 && excludeLinkIds.length > 0) {
      // }
    }

    return new Response("OK");
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
