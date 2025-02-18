import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { prisma } from "@dub/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  folderId: z.string(),
});

// POST /api/cron/links/sync-tinybird
// Sync the link changes to the Tinybird datasource
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    await verifyQstashSignature({ req, rawBody });

    const { folderId } = schema.parse(JSON.parse(rawBody));

    const folder = await prisma.folder.findUnique({
      where: {
        id: folderId,
      },
      select: {
        _count: {
          select: {
            links: true,
          },
        },
      },
    });

    if (!folder) {
      return new Response("Folder not found. Skipping...");
    }

    const countOfLinks = folder._count.links;

    if (countOfLinks === 0) {
      return new Response("No links found in the folder. Skipping...");
    }

    // TODO:
    // Find 100 of 5 batches of links
    // - call recordLink for each link
    // - Update the folderId to null for each link
    // invoke scheduleLinkSync with another batch



    return new Response("Link synced to Tinybird.");
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
