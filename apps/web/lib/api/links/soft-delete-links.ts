import { triggerLinksCleanupJob } from "@/lib/cron/links-cleanup";
import { prisma } from "@/lib/prisma";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import { linkEventSchema } from "@/lib/zod/schemas/links";
import { Link, Project } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { transformLink } from ".";

// Soft delete a link
export const softDeleteLink = async ({
  link,
  workspace,
}: {
  link: Link;
  workspace: Project;
}) => {
  await prisma.$transaction([
    prisma.link.update({
      where: {
        id: link.id,
      },
      data: {
        projectId: null,
      },
    }),

    prisma.project.update({
      where: {
        id: workspace.id,
      },
      data: {
        linksUsage: {
          decrement: 1,
        },
      },
    }),
  ]);

  waitUntil(
    (async () => {
      Promise.all([
        sendWorkspaceWebhook({
          trigger: "link.deleted",
          workspace,
          data: linkEventSchema.parse(transformLink(link)),
        }),

        triggerLinksCleanupJob({
          workspaceId: workspace.id,
          linkId: link.id,
        }),

        prisma.project.update({
          where: {
            id: workspace.id,
          },
          data: {
            linksUsage: {
              decrement: 1,
            },
          },
        }),
      ]);
    })(),
  );
};

// Soft delete a domain and its links
export const softDeleteDomainAndLinks = async ({
  domain,
  workspace,
}: {
  domain: string;
  workspace: Project;
}) => {
  const [links] = await Promise.all([
    prisma.link.updateMany({
      where: { domain, projectId: workspace.id },
      data: { projectId: null },
    }),

    prisma.domain.update({
      where: { slug: domain },
      data: { projectId: null },
    }),
  ]);

  // TODO:
  // Remove the domain from Vercel

  waitUntil(
    (async () => {
      Promise.all([
        triggerLinksCleanupJob({
          workspaceId: workspace.id,
          domain,
        }),

        prisma.project.update({
          where: {
            id: workspace.id,
          },
          data: {
            linksUsage: {
              decrement: links.count,
            },
          },
        }),
      ]);
    })(),
  );
};
