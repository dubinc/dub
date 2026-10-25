import { getWorkspaceLogoStorageKey } from "@/lib/api/workspaces/workspace-logo";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { WorkspaceProps } from "@/lib/types";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { qstash } from "../../cron";
import { cancelSubscription } from "../../stripe/cancel-subscription";

export async function deleteWorkspace(
  workspace: Pick<WorkspaceProps, "id" | "slug" | "logo" | "stripeId">,
) {
  await Promise.all([
    // Remove the users
    prisma.projectUsers.deleteMany({
      where: {
        projectId: workspace.id,
      },
    }),

    // Remove the default workspace
    prisma.user.updateMany({
      where: {
        defaultWorkspace: workspace.slug,
      },
      data: {
        defaultWorkspace: null,
      },
    }),

    // Remove the API keys
    prisma.restrictedToken.deleteMany({
      where: {
        projectId: workspace.id,
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

      // Queue the workspace for deletion
      qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/workspaces/delete`,
        body: {
          workspaceId: workspace.id,
        },
      }),
    ]),
  );
}
