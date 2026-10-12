import { getWorkspaceLogoStorageKey } from "@/lib/api/workspaces/workspace-logo";
import { prisma } from "@/lib/prisma";
import { assertNotStagingWorkspace } from "@/lib/sandbox/workspace-guards";
import { storage } from "@/lib/storage";
import { WorkspaceProps } from "@/lib/types";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { qstash } from "../../cron";
import { cancelSubscription } from "../../stripe/cancel-subscription";

export async function deleteWorkspace(
  workspace: Pick<
    WorkspaceProps,
    "id" | "slug" | "logo" | "stripeId" | "stagingWorkspaceId" | "environment"
  >,
) {
  assertNotStagingWorkspace(workspace, {
    message: "Workspace deletion is not permitted for staging environments.",
  });

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

  const logoKey = getWorkspaceLogoStorageKey({
    workspaceId: workspace.id,
    logoUrl: workspace.logo,
  });

  waitUntil(
    Promise.allSettled([
      // Cancel the workspace's Stripe subscription if exists
      workspace.stripeId &&
        cancelSubscription({ customerId: workspace.stripeId }),

      // Delete workspace logo if it's a custom logo stored in R2
      logoKey && storage.delete({ key: logoKey }),

      // Queue the workspace(s) for deletion
      ...workspaces.map((ws) =>
        qstash.publishJSON({
          url: `${APP_DOMAIN_WITH_NGROK}/api/cron/workspaces/delete`,
          body: {
            workspaceId: ws.id,
          },
        }),
      ),
    ]),
  );
}
