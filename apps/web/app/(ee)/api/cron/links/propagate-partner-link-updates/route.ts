import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { linkCache } from "@/lib/api/links/cache";
import { includeTags } from "@/lib/api/links/include-tags";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { recordLink } from "@/lib/tinybird";
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

// POST /api/cron/links/propagate-partner-link-updates
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
      include: {
        links: {
          include: {
            ...includeTags,
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

    for (const linkChunk of linkChunks) {
      await Promise.allSettled([
        // Expire the cache for the links
        linkCache.expireMany(
          linkChunk.map(({ domain, key }) => ({ domain, key })),
        ),

        // Record the updated links in Tinybird
        recordLink(
          linkChunk.map((link) => ({
            ...link,
            partnerGroupId: group.id,
          })),
        ),
      ]);
    }

    return new Response("OK");
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
