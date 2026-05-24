import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { bulkDeleteLinks } from "@/lib/api/links/bulk-delete-links";
import { includeProgramEnrollment } from "@/lib/api/links/include-program-enrollment";
import { includeTags } from "@/lib/api/links/include-tags";
import { qstash } from "@/lib/cron";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK, log, prettyPrint } from "@dub/utils";
import * as z from "zod/v4";
import { logAndRespond } from "../../utils";
export const dynamic = "force-dynamic";

const MAX_LINKS_PER_BATCH = 100;

const schema = z.object({
  partnerGroupDefaultLinkId: z.string(),
});

// POST /api/cron/groups/delete-default-links – delete a default link for a group
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    await verifyQstashSignature({ req, rawBody });

    const { partnerGroupDefaultLinkId } = schema.parse(JSON.parse(rawBody));

    const linksToDelete = await prisma.link.findMany({
      where: {
        partnerGroupDefaultLinkId,
        clicks: 0, // only delete links that have no clicks / activity
      },
      take: MAX_LINKS_PER_BATCH,
      include: {
        ...includeTags,
        ...includeProgramEnrollment,
      },
    });

    if (linksToDelete.length > 0) {
      const deletedLinks = await prisma.link.deleteMany({
        where: {
          id: {
            in: linksToDelete.map(({ id }) => id),
          },
        },
      });

      console.log(
        `Deleted ${deletedLinks.count} links for partner group default link ${partnerGroupDefaultLinkId}.`,
      );

      await bulkDeleteLinks(linksToDelete);

      // if linksToDelete is equals to MAX_LINKS_PER_BATCH, there might be more links to delete, so schedule another job to delete the remaining links
      if (linksToDelete.length === MAX_LINKS_PER_BATCH) {
        const deleteDefaultLinksJob = await qstash.publishJSON({
          url: `${APP_DOMAIN_WITH_NGROK}/api/cron/groups/delete-default-links`,
          body: {
            partnerGroupDefaultLinkId,
          },
        });

        return logAndRespond(
          `Scheduled delete-default-links job for partner group default link ${partnerGroupDefaultLinkId}: ${prettyPrint(deleteDefaultLinksJob)}`,
        );
      }
    }

    // no more links with activity left, remove the partner group default link id from any remaining links (that have no activity)
    let batch = 0;
    const BATCH_LIMIT = 20;
    while (batch < BATCH_LIMIT) {
      const updatedLinks = await prisma.link.updateMany({
        where: {
          partnerGroupDefaultLinkId,
        },
        data: {
          partnerGroupDefaultLinkId: null,
        },
        limit: MAX_LINKS_PER_BATCH,
      });

      if (updatedLinks.count === 0) {
        break;
      }

      batch++;
    }

    if (batch === BATCH_LIMIT) {
      // if batch limit reached, there might be more links to update, so schedule another job to delete the remaining links
      const deleteDefaultLinksJob = await qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/groups/delete-default-links`,
        body: {
          partnerGroupDefaultLinkId,
        },
      });

      return logAndRespond(
        `Scheduled delete-default-links job for partner group default link ${partnerGroupDefaultLinkId}: ${prettyPrint(deleteDefaultLinksJob)}`,
      );
    }

    // finally, delete the partner group default link
    await prisma.partnerGroupDefaultLink.delete({
      where: {
        id: partnerGroupDefaultLinkId,
      },
    });

    return logAndRespond(
      `Finished deleting all default links for partner group default link ${partnerGroupDefaultLinkId}.`,
    );
  } catch (error) {
    await log({
      message: `Error deleting default links: ${error.message}.`,
      type: "errors",
    });

    return handleAndReturnErrorResponse(error);
  }
}
