import { sendEmail } from "@dub/email";
import { IntegrationInstalled } from "@dub/email/templates/integration-installed";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";

interface InstallIntegration {
  userId: string;
  workspaceId: string;
  integrationId: string;
  credentials?: Record<string, any>;
}

// Install an integration for a user in a workspace
export const installIntegration = async ({
  userId,
  workspaceId,
  integrationId,
  credentials,
}: InstallIntegration) => {
  const installation = await prisma.installedIntegration.upsert({
    create: {
      userId,
      projectId: workspaceId,
      integrationId,
      credentials,
    },
    update: {
      credentials,
    },
    where: {
      userId_integrationId_projectId: {
        userId,
        projectId: workspaceId,
        integrationId,
      },
    },
  });

  waitUntil(
    (async () => {
      const workspace = await prisma.project.findUniqueOrThrow({
        where: {
          id: workspaceId,
        },
        select: {
          name: true,
          slug: true,
          users: {
            select: {
              user: {
                select: { email: true },
              },
            },
            where: {
              userId,
            },
          },
          installedIntegrations: {
            where: {
              integrationId,
            },
            select: {
              integration: {
                select: {
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
      });

      const email =
        workspace.users.length > 0 ? workspace.users[0].user.email : null;
      const integration =
        workspace.installedIntegrations.length > 0
          ? workspace.installedIntegrations[0].integration
          : null;

      if (email && integration) {
        await sendEmail({
          email: email!,
          subject: `The "${integration.name}" integration has been added to your workspace`,
          react: IntegrationInstalled({
            email: email!,
            workspace: {
              name: workspace.name,
              slug: workspace.slug,
            },
            integration: {
              name: integration.name,
              slug: integration.slug,
            },
          }),
        });
      }
    })(),
  );

  return installation;
};
