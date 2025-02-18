import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { scheduleLinkSync } from "@/lib/api/links/utils/sync-links";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { recordLink } from "@/lib/tinybird";
import { prisma } from "@dub/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const MAX_LINKS_PER_BATCH = 500;

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
      await prisma.folder.delete({
        where: {
          id: folderId,
        },
      });

      return new Response("No more links to process. Deleting folder...");
    }

    const processedLinks = await prisma.$transaction(
      async (tx) => {
        const links = await tx.link.findMany({
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
          orderBy: {
            id: "asc",
          },
          take: MAX_LINKS_PER_BATCH,
        });

        await recordLink(
          links.map((link) => ({
            ...link,
            folderId: null,
          })),
        );

        await tx.link.updateMany({
          where: {
            id: {
              in: links.map((link) => link.id),
            },
          },
          data: {
            folderId: null,
          },
        });

        return links;
      },
      {
        timeout: 10000,
      },
    );

    await scheduleLinkSync({
      folderId,
      delay: 2,
    });

    return new Response(
      `Processed ${processedLinks.length} links in the folder.`,
    );
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
