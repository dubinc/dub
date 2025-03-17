import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { linkCache } from "@/lib/api/links/cache";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { prisma } from "@dub/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  discountId: z.string(),
});

// POST /api/cron/links/sync-discounts - Sync the partner link discounts to Redis
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    await verifyQstashSignature({ req, rawBody });

    const { discountId } = schema.parse(JSON.parse(rawBody));

    const { program, ...discount } = await prisma.discount.findUniqueOrThrow({
      where: {
        id: discountId,
      },
      include: {
        program: {
          select: {
            id: true,
            defaultDiscountId: true,
          },
        },
      },
    });

    const isDefault = program.defaultDiscountId === discountId;

    const links = await prisma.link.findMany({
      where: {
        programId: program.id,
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
      take: 1,
    });

    await linkCache.mset(
      links.map((link) => ({
        ...link,
        webhooks: link.webhooks.map(({ id }) => ({ webhookId: id })),
        partner: link.programEnrollment?.partner,
        discount,
      })),
    );

    return new Response("OK");
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
