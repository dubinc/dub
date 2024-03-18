import { deleteDomainAndLinks } from "@/lib/api/domains";
import prisma from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { cancelSubscription } from "@/lib/stripe";
import {
  DUB_DOMAINS_ARRAY,
  LEGAL_USER_ID,
  LEGAL_WORKSPACE_ID,
} from "@dub/utils";
import { WorkspaceProps } from "../types";
import { redis } from "../upstash";

export async function deleteWorkspace(
  workspace: Pick<WorkspaceProps, "id" | "slug" | "stripeId" | "logo">,
) {
  const [customDomains, defaultDomainLinks] = await Promise.all([
    prisma.domain.findMany({
      where: {
        projectId: workspace.id,
      },
      select: {
        slug: true,
      },
    }),
    prisma.link.findMany({
      where: {
        projectId: workspace.id,
        domain: {
          in: DUB_DOMAINS_ARRAY,
        },
      },
      select: {
        id: true,
        domain: true,
        key: true,
        proxy: true,
        image: true,
      },
    }),
  ]);

  const linksByDomain: Record<string, string[]> = {};
  defaultDomainLinks.forEach(async (link) => {
    const { domain, key } = link;

    if (!linksByDomain[domain]) {
      linksByDomain[domain] = [];
    }
    linksByDomain[domain].push(key.toLowerCase());
  });

  const pipeline = redis.pipeline();

  Object.entries(linksByDomain).forEach(([domain, links]) => {
    pipeline.hdel(domain, ...links);
  });

  // delete all domains, links, and uploaded images associated with the workspace
  const deleteDomainsLinksResponse = await Promise.allSettled([
    ...customDomains.map(({ slug }) =>
      deleteDomainAndLinks(slug, {
        // here, we don't need to delete in prisma because we're deleting the workspace later and have onDelete: CASCADE set
        skipPrismaDelete: true,
      }),
    ),
    // delete all default domain links from redis
    pipeline.exec(),
    // remove all images from R2
    ...defaultDomainLinks.map(({ id, proxy, image }) =>
      proxy && image?.startsWith(process.env.STORAGE_BASE_URL as string)
        ? storage.delete(`images/${id}`)
        : Promise.resolve(),
    ),
  ]);

  const deleteWorkspaceResponse = await Promise.all([
    // delete workspace logo if it's a custom logo stored in R2
    workspace.logo?.startsWith(process.env.STORAGE_BASE_URL as string) &&
      storage.delete(`logos/${workspace.id}`),
    // if they have a Stripe subscription, cancel it
    workspace.stripeId && cancelSubscription(workspace.stripeId),
    // delete the workspace
    prisma.project.delete({
      where: {
        slug: workspace.slug,
      },
    }),
  ]);

  return {
    deleteDomainsLinksResponse,
    deleteWorkspaceResponse,
  };
}

export async function deleteWorkspaceAdmin(
  workspace: Pick<WorkspaceProps, "id" | "slug" | "stripeId" | "logo">,
) {
  const [customDomains, _] = await Promise.all([
    prisma.domain.findMany({
      where: {
        projectId: workspace.id,
      },
      select: {
        slug: true,
      },
    }),
    prisma.link.updateMany({
      where: {
        projectId: workspace.id,
        domain: {
          in: DUB_DOMAINS_ARRAY,
        },
      },
      data: {
        userId: LEGAL_USER_ID,
        projectId: LEGAL_WORKSPACE_ID,
      },
    }),
  ]);

  // delete all domains, links, and uploaded images associated with the workspace
  const deleteDomainsLinksResponse = await Promise.allSettled([
    ...customDomains.map(({ slug }) =>
      deleteDomainAndLinks(slug, {
        // here, we don't need to delete in prisma because we're deleting the workspace later and have onDelete: CASCADE set
        skipPrismaDelete: true,
      }),
    ),
  ]);

  const deleteWorkspaceResponse = await Promise.all([
    // delete workspace logo if it's a custom logo stored in R2
    workspace.logo?.startsWith(process.env.STORAGE_BASE_URL as string) &&
      storage.delete(`logos/${workspace.id}`),
    // if they have a Stripe subscription, cancel it
    workspace.stripeId && cancelSubscription(workspace.stripeId),
    // delete the workspace
    prisma.project.delete({
      where: {
        slug: workspace.slug,
      },
    }),
  ]);

  return {
    deleteDomainsLinksResponse,
    deleteWorkspaceResponse,
  };
}
