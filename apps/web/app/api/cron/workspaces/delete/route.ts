import { removeDomainFromVercel } from "@/lib/api/domains";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { bulkDeleteLinks } from "@/lib/api/links/bulk-delete-links";
import { queueWorkspaceDeletion } from "@/lib/api/workspaces";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  workspaceId: z.string(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    await verifyQstashSignature(req, body);

    const { workspaceId } = schema.parse(body);

    const workspace = await prisma.project.findUnique({
      where: {
        id: workspaceId,
      },
    });

    if (!workspace) {
      return new Response(`Workspace ${workspaceId} not found. Skipping...`);
    }

    // Delete links in batches
    const links = await prisma.link.findMany({
      where: {
        projectId: workspace.id,
      },
      include: {
        tags: true,
      },
      take: 100,
    });

    if (links.length > 0) {
      await Promise.all([
        prisma.link.deleteMany({
          where: {
            id: {
              in: links.map((link) => link.id),
            },
          },
        }),

        bulkDeleteLinks({
          workspaceId: workspace.id,
          links,
        }),
      ]);
    }

    const remainingLinks = await prisma.link.count({
      where: {
        projectId: workspace.id,
      },
    });

    if (remainingLinks > 0) {
      await queueWorkspaceDeletion({
        workspaceId: workspace.id,
        delay: 2,
      });

      return new Response("Workspace links deletion queued.");
    }

    // Delete the custom domains
    const domains = await prisma.domain.findMany({
      where: {
        projectId: workspace.id,
      },
    });

    if (domains.length > 0) {
      await Promise.all([
        prisma.domain.deleteMany({
          where: {
            projectId: workspace.id,
          },
        }),

        domains.map(({ slug }) => removeDomainFromVercel(slug)),
      ]);
    }

    // Delete the workspace
    await prisma.project.delete({
      where: { id: workspace.id },
    });

    return new Response("Workspace deleted.");
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
