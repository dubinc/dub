import { getWorkspaceLogoStorageKey } from "@/lib/api/workspaces/workspace-logo";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { WorkspaceProps } from "@/lib/types";
import {
  APP_DOMAIN_WITH_NGROK,
  DUB_DOMAINS_ARRAY,
  LEGAL_USER_ID,
  LEGAL_WORKSPACE_ID,
} from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { qstash } from "../../cron";
import { cancelSubscription } from "../../stripe/cancel-subscription";
import { markDomainAsDeleted } from "../domains/mark-domain-deleted";
import { linkCache } from "../links/cache";

export async function deleteWorkspace(
  workspace: Pick<
    WorkspaceProps,
    "id" | "slug" | "logo" | "stripeId" | "stagingWorkspaceId"
  >,
) {
  const stagingWorkspace = workspace.stagingWorkspaceId
    ? await prisma.project.findUnique({
        where: {
          id: workspace.stagingWorkspaceId,
        },
        select: {
          id: true,
          slug: true,
        },
      })
    : null;

  const workspaces = [
    workspace,
    ...(stagingWorkspace ? [stagingWorkspace] : []),
  ];

  await Promise.all([
    // Remove the users
    prisma.projectUsers.deleteMany({
      where: {
        projectId: {
          in: workspaces.map(({ id }) => id),
        },
      },
    }),

    // Remove the default workspace
    prisma.user.updateMany({
      where: {
        defaultWorkspace: {
          in: workspaces.map(({ slug }) => slug),
        },
      },
      data: {
        defaultWorkspace: null,
      },
    }),

    // Remove the API keys
    prisma.restrictedToken.deleteMany({
      where: {
        projectId: {
          in: workspaces.map(({ id }) => id),
        },
      },
    }),

    prisma.project.update({
      where: {
        id: workspace.id,
      },
      data: {
        stagingWorkspaceId: null,
      },
    }),
  ]);

  waitUntil(
    Promise.all(
      workspaces.map((workspace) =>
        qstash.publishJSON({
          url: `${APP_DOMAIN_WITH_NGROK}/api/cron/workspaces/delete`,
          body: {
            workspaceId: workspace.id,
          },
        }),
      ),
    ),
  );
}

export async function deleteWorkspaceAdmin(
  workspace: Pick<WorkspaceProps, "id" | "slug" | "logo" | "stripeId">,
) {
  while (true) {
    const defaultDomainLinks = await prisma.link.findMany({
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
      },
      take: 100,
    });

    if (defaultDomainLinks.length === 0) {
      break;
    }

    const [redisRes, prismaRes] = await Promise.allSettled([
      linkCache.expireMany(defaultDomainLinks),
      prisma.link.updateMany({
        where: {
          id: {
            in: defaultDomainLinks.map((link) => link.id),
          },
        },
        data: {
          projectId: LEGAL_WORKSPACE_ID,
          userId: LEGAL_USER_ID,
        },
      }),
    ]);

    console.log(
      `Banned ${defaultDomainLinks.length} default domain links for ${workspace.slug}`,
      redisRes,
      prismaRes,
    );
  }

  const customDomains = await prisma.domain.findMany({
    where: {
      projectId: workspace.id,
    },
    select: {
      slug: true,
    },
  });

  // delete all domains, links, and uploaded images associated with the workspace
  const deleteDomainsLinksResponse = await Promise.allSettled(
    customDomains.map(({ slug }) =>
      markDomainAsDeleted({
        domain: slug,
      }),
    ),
  );

  console.log(
    `Deleted ${customDomains.length} custom domains for ${workspace.slug}`,
    deleteDomainsLinksResponse,
  );

  // Delete folders
  const deleteFoldersResponse = await prisma.folder.deleteMany({
    where: {
      projectId: workspace.id,
    },
  });

  console.log(
    `Deleted ${deleteFoldersResponse.count} folders for ${workspace.slug}`,
  );

  // Delete customers
  const deleteCustomersResponse = await prisma.customer.deleteMany({
    where: {
      projectId: workspace.id,
    },
  });

  console.log(
    `Deleted ${deleteCustomersResponse.count} customers for ${workspace.slug}`,
  );

  const logoKey = getWorkspaceLogoStorageKey({
    workspaceId: workspace.id,
    logoUrl: workspace.logo,
  });

  const deleteWorkspaceResponse = await Promise.allSettled([
    // delete workspace logo if it's a custom logo stored in R2
    logoKey && storage.delete({ key: logoKey }),
    // if they have a Stripe subscription, cancel it
    workspace.stripeId && cancelSubscription(workspace.stripeId),
    // delete the workspace
    prisma.project.delete({
      where: {
        slug: workspace.slug,
      },
    }),
  ]);

  console.log(`Deleted workspace ${workspace.slug}`, deleteWorkspaceResponse);

  return {
    deleteDomainsLinksResponse,
    deleteWorkspaceResponse,
  };
}
