import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { linkCache } from "@/lib/api/links/cache";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { redis } from "@/lib/upstash";
import { prisma } from "@dub/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  programId: z.string(),
  discountId: z.string(),
  isDefault: z.boolean(),
  action: z.enum(["discount-created", "discount-updated", "discount-deleted"]),
});

// This route is used to invalidate the partnerlink cache when a discount is created/updated/deleted.
// POST /api/cron/links/invalidate-for-discounts
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    await verifyQstashSignature({ req, rawBody });

    const body = schema.parse(JSON.parse(rawBody));
    const { programId, discountId, isDefault, action } = body;

    if (action === "discount-created" || action === "discount-updated") {
      const discount = await prisma.discount.findUnique({
        where: {
          id: discountId,
        },
      });

      if (!discount) {
        return new Response("Discount not found.");
      }

      let page = 0;
      let total = 0;
      const take = 1000;

      while (true) {
        const links = await prisma.link.findMany({
          where: {
            programEnrollment: { discountId },
          },
          select: {
            domain: true,
            key: true,
          },
          take,
          skip: page * take,
        });

        if (links.length === 0) {
          break;
        }

        await linkCache.expireMany(links);

        page += 1;
        total += links.length;
      }

      return new Response(`Invalidated ${total} links.`);
    }

    if (action === "discount-deleted") {
      let page = 0;
      let total = 0;
      const take = 1000;

      while (true) {
        let partnerIds: string[] = [];

        if (!isDefault) {
          partnerIds =
            (await redis.lpop<string[]>(
              `discount-partners:${discountId}`,
              take,
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
          select: {
            domain: true,
            key: true,
          },
          take,
          skip: page * take,
        });

        if (links.length === 0) {
          break;
        }

        await linkCache.expireMany(links);

        page += 1;
        total += links.length;
      }

      return new Response(`Invalidated ${total} links.`);
    }

    return new Response("OK");
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
