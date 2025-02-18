import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { scheduleLinkSync } from "@/lib/api/links/utils/sync-links";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { recordLink } from "@/lib/tinybird";
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

    const links = await prisma.link.findMany({
      where: {
        folderId,
      },
      include: {
        tags: {
          select: {
            tag: true,
          },
        },
      },
      take: 500,
    });

    await recordLink(links);

    await prisma.link.updateMany({
      where: {
        id: {
          in: links.map((link) => link.id),
        },
      },
      data: {
        folderId: null,
      },
    });

    await scheduleLinkSync({
      folderId,
      delay: 2,
    });

    return new Response(`Processed ${links.length} links in the folder.`);
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
