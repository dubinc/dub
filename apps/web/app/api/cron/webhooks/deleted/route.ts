import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { linkCache } from "@/lib/api/links/cache";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { isLinkLevelWebhook } from "@/lib/webhook/utils";
import { prisma } from "@dub/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  webhookId: z.string(),
});

// This route is used to sync webhooks with the links cache when a webhook is deleted
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    await verifyQstashSignature({ req, rawBody });

    const { webhookId } = schema.parse(JSON.parse(rawBody));

    const linksCount = await prisma.linkWebhook.groupBy({
      by: ["enabled"],
      where: {
        webhookId,
      },
      _count: true,
    });

    const includedLinksCount =
      linksCount.find((link) => link.enabled)?._count || 0;
    const excludedLinksCount =
      linksCount.find((link) => !link.enabled)?._count || 0;

    // Include specific links
    if (includedLinksCount > 0) {
      let skip = 0;
      const take = 1000;

      while (true) {
        const linkWebhooks = await prisma.linkWebhook.findMany({
          where: {
            webhookId,
            enabled: true,
          },
          skip,
          take,
        });

        if (linkWebhooks.length === 0) {
          break;
        }

        const links = await prisma.link.findMany({
          where: {
            id: {
              in: linkWebhooks.map((link) => link.linkId),
            },
          },
          include: {
            tags: {
              include: {
                tag: true,
              },
            },
            webhooks: true,
          },
        });

        await linkCache.mset(links);

        skip += take;
      }
    }

    // Exclude specific links
    if (excludedLinksCount > 0) {
      //
    }

    return new Response("OK");
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
