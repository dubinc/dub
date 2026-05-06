import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { includeProgramEnrollment } from "@/lib/api/links/include-program-enrollment";
import { includeTags } from "@/lib/api/links/include-tags";
import { queuePartnerTagDeletion } from "@/lib/api/tags/queue-tag-deletion";
import { CRON_BATCH_SIZE } from "@/lib/cron";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { recordLink } from "@/lib/tinybird";
import { prisma } from "@dub/prisma";
import * as z from "zod/v4";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const schema = z.object({
  id: z.string(),
});

// POST /api/cron/tags/delete-partner-tag
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    await verifyQstashSignature({ req, rawBody });

    const { id: partnerTagId } = schema.parse(JSON.parse(rawBody));

    const partnerTag = await prisma.partnerTag.findUnique({
      where: {
        id: partnerTagId,
      },
    });

    if (!partnerTag || partnerTag.programId !== null) {
      return logAndRespond(
        `Partner tag ${partnerTagId} not found or not marked for deletion. Skipping...`,
      );
    }

    const programPartnerTags = await prisma.programPartnerTag.findMany({
      where: {
        partnerTagId,
      },
      select: {
        id: true,
        programEnrollment: {
          select: {
            id: true,
          },
        },
      },
      take: CRON_BATCH_SIZE,
    });

    if (programPartnerTags.length === 0) {
      await prisma.partnerTag.delete({
        where: {
          id: partnerTagId,
        },
      });

      return logAndRespond(
        `No ProgramPartnerTag rows left. Partner tag ${partnerTagId} deleted from database.`,
      );
    }

    const { count } = await prisma.programPartnerTag.deleteMany({
      where: {
        id: {
          in: programPartnerTags.map((row) => row.id),
        },
      },
    });
    console.log(`Deleted ${count} program–partner tag associations`);

    const linksToUpdate = await prisma.link.findMany({
      where: {
        programEnrollment: {
          id: {
            in: programPartnerTags.map((row) => row.programEnrollment.id),
          },
        },
      },
      include: {
        ...includeTags,
        ...includeProgramEnrollment,
      },
    });

    console.log(`Found ${linksToUpdate.length} links to update in Tinybird`);

    await recordLink(linksToUpdate);

    await queuePartnerTagDeletion({
      partnerTagId,
      delay: 2,
    });
    return logAndRespond("Batch completed, starting next batch...");
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
