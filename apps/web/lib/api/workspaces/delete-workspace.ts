import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { WorkspaceProps } from "@/lib/types";
import { APP_DOMAIN_WITH_NGROK, prettyPrint, R2_URL } from "@dub/utils";
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
  ]).then((results) => {
    console.log(prettyPrint(results));
  });

  waitUntil(
    Promise.allSettled([
      // Remove the API keys
      prisma.restrictedToken.deleteMany({
        where: {
          projectId: workspace.id,
        },
      }),

      // Cancel the workspace's Stripe subscription if exists
      workspace.stripeId &&
        cancelSubscription({ customerId: workspace.stripeId }),

      // Delete workspace logo if it's a custom logo stored in R2
      workspace.logo &&
        workspace.logo.startsWith(`${R2_URL}/logos/${workspace.id}`) &&
        storage.delete({ key: workspace.logo.replace(`${R2_URL}/`, "") }),

      // Queue the workspace for deletion
      qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/workspaces/delete`,
        body: {
          workspaceId: workspace.id,
        },
      }),
    ]).then((results) => {
      console.log(prettyPrint(results));
    }),
  );
}
