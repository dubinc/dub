import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { sendEmail } from "emails";
import IntegrationInstalled from "emails/integration-installed";

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
      const [integration, workspace] = await Promise.all([
        prisma.integration.findUniqueOrThrow({
          where: {
            id: integrationId,
          },
          select: {
            id: true,
            name: true,
            slug: true,
          },
        }),

        prisma.project.findUniqueOrThrow({
          where: {
            id: workspaceId,
            users: {
              some: {
                role: "owner",
              },
            },
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
            },
          },
        }),
      ]);

      await Promise.all(
        workspace.users.map(({ user: { email } }) =>
          sendEmail({
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
          }),
        ),
      );
    })(),
  );

  return installation;
};
