import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { linkCache } from "@/lib/api/links/cache";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { prisma } from "@dub/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  partnerId: z.string(),
});

// This route is used to invalidate the partnerlink cache when the partner info is updated.
// POST /api/cron/links/invalidate-for-partners
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    await verifyQstashSignature({ req, rawBody });

    const { partnerId } = schema.parse(JSON.parse(rawBody));

    const programs = await prisma.programEnrollment.findMany({
      where: {
        partnerId,
      },
      select: {
        programId: true,
      },
    });

    const links = await prisma.link.findMany({
      where: {
        programId: {
          in: programs.map(({ programId }) => programId),
        },
        partnerId,
      },
      select: {
        domain: true,
        key: true,
      },
    });

    if (!links || links.length === 0) {
      return new Response("No links found.");
    }

    await linkCache.expireMany(links);

    return new Response(`Invalidated ${links.length} links.`);
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
