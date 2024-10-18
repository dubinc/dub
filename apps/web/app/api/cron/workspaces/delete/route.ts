import { deleteDomain } from "@/lib/api/domains/delete-domain";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { bulkDeleteLinks } from "@/lib/api/links/bulk-delete-links";
import { qstash } from "@/lib/cron";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { prisma } from "@/lib/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { Project } from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  workspaceId: z.string(),
});

// POST /api/cron/workspaces/delete - Delete a workspace and its associated links, domains, etc.
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
      return new Response("Workspace not found. Skipping...");
    }

    await deleteWorkspaceAndResources(workspace);

    return new Response("Workspace deleted.");
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}

// Delete workspace, its links, domains, etc.
const deleteWorkspaceAndResources = async (workspace: Project) => {
  const links = await prisma.link.findMany({
    where: {
      projectId: workspace.id,
    },
    include: {
      tags: true,
    },
    take: 1000,
  });

  await bulkDeleteLinks({
    links,
    workspaceId: workspace.id,
  });

  const count = await prisma.link.count({
    where: {
      projectId: workspace.id,
    },
  });

  if (count > 0) {
    return await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/workspaces/delete`,
      delay: 3, // 3 seconds
      body: {
        workspaceId: workspace.id,
      },
    });
  }

  // Delete the workspace's domains
  const domains = await prisma.domain.findMany({
    where: {
      projectId: workspace.id,
    },
    select: {
      slug: true,
    },
  });

  await Promise.all(domains.map(({ slug }) => deleteDomain(slug)));

  // Finally, delete the workspace
  await prisma.project.delete({
    where: {
      id: workspace.id,
    },
  });
};
