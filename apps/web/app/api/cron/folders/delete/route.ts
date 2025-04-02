import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { queueFolderDeletion } from "@/lib/api/folders/queue-folder-deletion";
import { includeTags } from "@/lib/api/links/include-tags";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { recordLink } from "@/lib/tinybird";
import { prisma } from "@dub/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const MAX_LINKS_PER_BATCH = 500;

const schema = z.object({
  folderId: z.string(),
});

// POST /api/cron/folders/delete
// Recursively remove the `folderId` association in all the links of a folder from Tinybird
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    await verifyQstashSignature({ req, rawBody });

    const { folderId } = schema.parse(JSON.parse(rawBody));

    const linksToUpdate = await prisma.link.findMany({
      where: {
        folderId,
      },
      take: MAX_LINKS_PER_BATCH,
      include: includeTags,
    });

    if (linksToUpdate.length === 0) {
      await prisma.folder.delete({
        where: {
          id: folderId,
        },
      });

      return new Response("No more links to process. Deleting folder...");
    }

    const recordLinkResponse = await recordLink(
      linksToUpdate.map((link) => ({
        ...link,
        folderId: null,
      })),
    );

    console.log("recordLinkResponse", recordLinkResponse);

    const updateLinksResponse = await prisma.link.updateMany({
      where: {
        id: {
          in: linksToUpdate.map((link) => link.id),
        },
      },
      data: {
        folderId: null,
      },
    });

    console.log("updateLinksResponse", updateLinksResponse);

    // TODO: technically we can check if linksToUpdate.length < MAX_LINKS_PER_BATCH
    // because that means all the links have been updated and we can delete the folder
    await queueFolderDeletion({
      folderId,
      delay: 2,
    });

    return new Response(
      `Processed ${linksToUpdate.length} links in the folder.`,
    );
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
