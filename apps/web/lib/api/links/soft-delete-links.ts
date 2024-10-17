import { triggerLinksCleanupJob } from "@/lib/cron/links-cleanup";
import { prisma } from "@/lib/prisma";
import { Link, Project } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { removeDomainFromVercel } from "../domains/remove-domain-vercel";

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

// Soft delete many links
export const softDeleteManyLinks = async ({
  links,
  workspace,
}: {
  links: Pick<Link, "id">[];
  workspace: Project;
}) => {
  const { count } = await prisma.link.updateMany({
    where: {
      id: { in: links.map((link) => link.id) },
      projectId: workspace.id,
    },
    data: {
      projectId: null,
    },
  });

  waitUntil(
    (async () => {
      Promise.all([
        triggerLinksCleanupJob({
          workspaceId: workspace.id,
          linkIds: links.map((link) => link.id),
        }),

        prisma.project.update({
          where: {
            id: workspace.id,
          },
          data: {
            linksUsage: {
              decrement: count,
            },
          },
        }),
      ]);
    })(),
  );

  return { count };
};

// Soft delete a domain and its links
export const softDeleteDomainAndLinks = async ({
  domain,
  workspace,
}: {
  domain: string;
  workspace: Pick<Project, "id">;
}) => {
  const [links] = await Promise.all([
    prisma.link.updateMany({
      where: {
        domain,
        projectId: workspace.id,
      },
      data: { projectId: null },
    }),

    prisma.domain.update({
      where: {
        slug: domain,
        projectId: workspace.id,
      },
      data: { projectId: null },
    }),
  ]);

  waitUntil(
    (async () => {
      Promise.all([
        triggerLinksCleanupJob({
          workspaceId: workspace.id,
          domain,
        }),

        removeDomainFromVercel(domain),

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
