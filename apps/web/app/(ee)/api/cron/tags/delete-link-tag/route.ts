import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { includeProgramEnrollment } from "@/lib/api/links/include-program-enrollment";
import { includeTags } from "@/lib/api/links/include-tags";
import { queueLinkTagDeletion } from "@/lib/api/tags/queue-tag-deletion";
import { CRON_BATCH_SIZE } from "@/lib/cron";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { recordLink } from "@/lib/tinybird/record-link";
import { prisma } from "@dub/prisma";
import * as z from "zod/v4";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const schema = z.object({
  id: z.string(),
});

// POST /api/cron/tags/delete-link-tag
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    await verifyQstashSignature({ req, rawBody });

    const { id: tagId } = schema.parse(JSON.parse(rawBody));

    const tag = await prisma.tag.findUnique({
      where: {
        id: tagId,
      },
    });

    if (!tag || tag.projectId !== null) {
      return logAndRespond(
        `Link tag ${tagId} not found or not marked for deletion. Skipping...`,
      );
    }

    const linkTags = await prisma.linkTag.findMany({
      where: {
        tagId,
      },
      select: {
        id: true,
        linkId: true,
      },
      take: CRON_BATCH_SIZE,
    });

    if (linkTags.length === 0) {
      await prisma.tag.delete({
        where: {
          id: tagId,
        },
      });

      return logAndRespond(
        `No LinkTag rows left. Link tag ${tagId} deleted from database.`,
      );
    }

    const linkIds = [...new Set(linkTags.map((lt) => lt.linkId))];

    const { count } = await prisma.linkTag.deleteMany({
      where: {
        id: {
          in: linkTags.map((lt) => lt.id),
        },
      },
    });

    console.log(`Deleted ${count} link–tag associations`);

    const linksToUpdate = await prisma.link.findMany({
      where: {
        id: {
          in: linkIds,
        },
      },
      include: {
        ...includeTags,
        ...includeProgramEnrollment,
      },
    });

    console.log(`Found ${linksToUpdate.length} links to update in Tinybird`);

    await recordLink(linksToUpdate);

    await queueLinkTagDeletion({
      tagId,
      delay: 2,
    });
    return logAndRespond("Batch completed, starting next batch...");
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
