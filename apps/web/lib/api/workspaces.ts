import { deleteDomainAndLinks } from "@/lib/api/domains";
import { dub } from "@/lib/dub";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { cancelSubscription } from "@/lib/stripe";
import { recordLink } from "@/lib/tinybird";
import { WorkspaceProps } from "@/lib/types";
import { formatRedisLink, redis } from "@/lib/upstash";
import {
  DUB_DOMAINS_ARRAY,
  LEGAL_USER_ID,
  LEGAL_WORKSPACE_ID,
  R2_URL,
} from "@dub/utils";
import { waitUntil } from "@vercel/functions";

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
        url: true,
        tags: {
          select: {
            tagId: true,
          },
        },
        proxy: true,
        image: true,
        projectId: true,
        createdAt: true,
      },
    }),
  ]);

  const response = await prisma.projectUsers.deleteMany({
    where: {
      projectId: workspace.id,
    },
  });

  waitUntil(
    (async () => {
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
        pipeline.hdel(domain.toLowerCase(), ...links);
      });

      // delete all domains, links, and uploaded images associated with the workspace
      await Promise.allSettled([
        ...customDomains.map(({ slug }) => deleteDomainAndLinks(slug)),
        // delete all default domain links from redis
        pipeline.exec(),
        // record deletes in Tinybird for default domain links
        recordLink(
          defaultDomainLinks.map((link) => ({
            link_id: link.id,
            domain: link.domain,
            key: link.key,
            url: link.url,
            tag_ids: link.tags.map((tag) => tag.tagId),
            workspace_id: link.projectId,
            created_at: link.createdAt,
            deleted: true,
          })),
        ),
        // remove all images from R2
        ...defaultDomainLinks.map(({ id, image }) =>
          image && image.startsWith(`${R2_URL}/images/${id}`)
            ? storage.delete(image.replace(`${R2_URL}/`, ""))
            : Promise.resolve(),
        ),
      ]);

      await Promise.all([
        // delete workspace logo if it's a custom logo stored in R2
        workspace.logo &&
          workspace.logo.startsWith(`${R2_URL}/logos/${workspace.id}`) &&
          storage.delete(workspace.logo.replace(`${R2_URL}/`, "")),
        // if they have a Stripe subscription, cancel it
        workspace.stripeId && cancelSubscription(workspace.stripeId),
        // set the referral link to `/deleted/[slug]`
        dub.links.update(`ext_ws_${workspace.id}`, {
          key: `/deleted/${workspace.slug}`,
          archived: true,
        }),
        // delete the workspace
        prisma.project.delete({
          where: {
            slug: workspace.slug,
          },
        }),
        prisma.user.updateMany({
          where: {
            defaultWorkspace: workspace.slug,
          },
          data: {
            defaultWorkspace: null,
          },
        }),
      ]);
    })(),
  );

  return response;
}

export async function deleteWorkspaceAdmin(
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
    }),
  ]);

  const updateLinkRedisResponse = await Promise.allSettled(
    defaultDomainLinks.map(async (link) => {
      return redis.hset(link.domain.toLowerCase(), {
        [link.key.toLowerCase()]: {
          ...(await formatRedisLink(link)),
          projectId: LEGAL_WORKSPACE_ID,
        },
      });
    }),
  );

  // update all default domain links to the legal workspace
  const updateLinkPrismaResponse = await prisma.link.updateMany({
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
  });

  console.log({ updateLinkRedisResponse, updateLinkPrismaResponse });

  // delete all domains, links, and uploaded images associated with the workspace
  const deleteDomainsLinksResponse = await Promise.allSettled([
    ...customDomains.map(({ slug }) => deleteDomainAndLinks(slug)),
  ]);

  const deleteWorkspaceResponse = await Promise.all([
    // delete workspace logo if it's a custom logo stored in R2
    workspace.logo &&
      workspace.logo.startsWith(`${R2_URL}/logos/${workspace.id}`) &&
      storage.delete(workspace.logo.replace(`${R2_URL}/`, "")),
    // if they have a Stripe subscription, cancel it
    workspace.stripeId && cancelSubscription(workspace.stripeId),
    // set the referral link to `/deleted/[slug]`
    dub.links.update(`ext_ws_${workspace.id}`, {
      key: `/deleted/${workspace.slug}`,
      archived: true,
    }),
    // delete the workspace
    prisma.project.delete({
      where: {
        slug: workspace.slug,
      },
    }),
  ]);

  return {
    updateLinkRedisResponse,
    updateLinkPrismaResponse,
    deleteDomainsLinksResponse,
    deleteWorkspaceResponse,
  };
}
