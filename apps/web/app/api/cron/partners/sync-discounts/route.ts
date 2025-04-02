import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { linkCache } from "@/lib/api/links/cache";
import { qstash } from "@/lib/cron";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { redis } from "@/lib/upstash";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  programId: z.string(),
  discountId: z.string(),
  isDefault: z.boolean(),
  page: z.number().optional().default(1),
  action: z.enum(["discount-created", "discount-updated", "discount-deleted"]),
});

const PAGE_SIZE = 100;

// POST /api/cron/partners/sync-discounts - Sync the partner link discounts to Redis
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    await verifyQstashSignature({ req, rawBody });

    const body = schema.parse(JSON.parse(rawBody));
    const { discountId, page, action, isDefault, programId } = body;

    // If the discount is created or updated, we need to add it to the Redis cache
    if (action === "discount-created" || action === "discount-updated") {
      const discount = await prisma.discount.findUnique({
        where: {
          id: discountId,
        },
      });

      if (!discount) {
        return new Response("Discount not found.");
      }

      const links = await prisma.link.findMany({
        where: {
          programId,
          programEnrollment: {
            discountId: isDefault ? null : discountId,
          },
        },
        include: {
          webhooks: {
            select: {
              id: true,
            },
          },
          programEnrollment: {
            select: {
              partner: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
            },
          },
        },
        take: PAGE_SIZE,
        skip: (page - 1) * PAGE_SIZE,
      });

      if (links.length === 0) {
        return new Response("No more links to process. Exiting...");
      }

      await linkCache.mset(
        links.map((link) => ({
          ...link,
          webhooks: link.webhooks.map(({ id }) => ({ webhookId: id })),
          partner: link.programEnrollment?.partner,
          discount,
        })),
      );

      await qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/partners/sync-discounts`,
        body: {
          ...body,
          page: page + 1,
        },
      });

      return new Response("OK");
    }

    // If the discount is deleted, we need to remove it from the Redis cache
    if (action === "discount-deleted") {
      let page = 0;

      while (true) {
        let partnerIds: string[] = [];

        if (!isDefault) {
          partnerIds =
            (await redis.lpop<string[]>(
              `discount-partners:${discountId}`,
              PAGE_SIZE,
            )) || [];

          // There won't be any entries in Redis for the default discount
          if (!partnerIds || partnerIds.length === 0) {
            await redis.del(`discount-partners:${discountId}`);
            break;
          }
        }

        const links = await prisma.link.findMany({
          where: {
            programId,
            programEnrollment: {
              ...(partnerIds.length > 0 && {
                partnerId: {
                  in: partnerIds,
                },
              }),
              discountId: null,
            },
          },
          include: {
            webhooks: {
              select: {
                id: true,
              },
            },
            programEnrollment: {
              select: {
                partner: {
                  select: {
                    id: true,
                    name: true,
                    image: true,
                  },
                },
              },
            },
          },
          take: PAGE_SIZE,
          skip: page * PAGE_SIZE,
        });

        if (links.length === 0) {
          break;
        }

        await linkCache.mset(
          links.map((link) => ({
            ...link,
            webhooks: link.webhooks.map(({ id }) => ({ webhookId: id })),
            partner: link.programEnrollment?.partner,
            discount: null,
          })),
        );

        page += 1;
      }
    }

    return new Response("OK");
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
