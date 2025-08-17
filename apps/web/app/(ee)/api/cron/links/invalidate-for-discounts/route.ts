import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { linkCache } from "@/lib/api/links/cache";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { prisma } from "@dub/prisma";
import { chunk } from "@dub/utils";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  groupId: z.string(),
  partnerIds: z
    .array(z.string())
    .optional()
    .describe(
      "If provided, only invalidate the cache for the given partner ids.",
    ),
});

// This route is used to invalidate the partnerlink cache when a discount is created/updated/deleted.
// POST /api/cron/links/invalidate-for-discounts
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    await verifyQstashSignature({ req, rawBody });

    const { groupId, partnerIds } = schema.parse(JSON.parse(rawBody));

    // Find the group
    const group = await prisma.partnerGroup.findUnique({
      where: {
        id: groupId,
      },
    });

    if (!group) {
      console.error(`Group ${groupId} not found.`);
      return new Response("OK");
    }

    // Find all the links of the partners in the group
    const programEnrollments = await prisma.programEnrollment.findMany({
      where: {
        groupId,
        ...(partnerIds && {
          partnerId: {
            in: partnerIds,
          },
        }),
      },
      select: {
        links: {
          select: {
            domain: true,
            key: true,
          },
        },
      },
    });

    if (programEnrollments.length === 0) {
      console.log(`No program enrollments found for group ${groupId}.`);
      return new Response("OK");
    }

    const links = programEnrollments.flatMap((enrollment) => enrollment.links);

    if (links.length === 0) {
      console.log(`No links found for partners in the group ${groupId}.`);
      return new Response("OK");
    }

    console.log(`Found ${links.length} links to invalidate the cache for.`);

    const linkChunks = chunk(links, 100);

    // Expire the cache for the links
    for (const linkChunk of linkChunks) {
      const toExpire = linkChunk.map(({ domain, key }) => ({ domain, key }));
      await linkCache.expireMany(toExpire);
      console.log(toExpire);
      console.log(`Expired cache for ${toExpire.length} links.`);
    }

    return new Response("OK");
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
